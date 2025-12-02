const express = require('express');
const Product = require('../models/Product');
const PriceHistory = require('../models/PriceHistory');
const auth = require('../middleware/auth');
const { getRedisClient } = require('../config/redis');

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
    const { name, url, platform, targetPrice, currentPrice, specifications, currency } = req.body;

    // Validate target price if provided
    if (targetPrice && currentPrice && parseFloat(targetPrice) >= parseFloat(currentPrice)) {
      return res.status(400).json({ 
        message: `Target price must be lower than current price`,
        currentPrice: currentPrice
      });
    }

    const product = new Product({
      name,
      url,
      platform,
      currency: currency || 'INR',
      targetPrice,
      currentPrice: parseFloat(currentPrice) || 0,
      specifications: specifications || '',
      userId: req.userId,
      priceHistory: currentPrice ? [{
        price: parseFloat(currentPrice),
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
    const product = await Product.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Validate target price if being updated
    if (req.body.targetPrice && product.currentPrice && 
        parseFloat(req.body.targetPrice) >= product.currentPrice) {
      return res.status(400).json({ 
        message: `Target price must be lower than current price`
      });
    }

    Object.assign(product, req.body);
    await product.save();

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