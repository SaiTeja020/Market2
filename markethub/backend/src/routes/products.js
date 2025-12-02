const express = require('express');
const Product = require('../models/Product');
const PriceHistory = require('../models/PriceHistory');
const auth = require('../middleware/auth');
const { getRedisClient } = require('../config/redis');
const { scrapePrice } = require('../utils/scraper');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const redis = getRedisClient();
    const cacheKey = `products:${req.userId}`;

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json({ products: JSON.parse(cached), cached: true });
      }
    }

    const products = await Product.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(100);

    if (redis) {
      await redis.setEx(cacheKey, 300, JSON.stringify(products));
    }

    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, url, platform, targetPrice } = req.body;

    const priceData = await scrapePrice(url, platform);

    const product = new Product({
      name,
      url,
      platform,
      targetPrice,
      currentPrice: priceData?.price || 0,
      userId: req.userId,
      priceHistory: priceData ? [{
        price: priceData.price,
        date: new Date()
      }] : []
    });

    await product.save();

    const redis = getRedisClient();
    if (redis) {
      await redis.del(`products:${req.userId}`);
    }

    res.status(201).json({ message: 'Product added successfully', product });
  } catch (error) {
    res.status(500).json({ message: 'Error adding product', error: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.metadata.views += 1;
    await product.save();

    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: req.body },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const redis = getRedisClient();
    if (redis) {
      await redis.del(`products:${req.userId}`);
    }

    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const redis = getRedisClient();
    if (redis) {
      await redis.del(`products:${req.userId}`);
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
});

module.exports = router;