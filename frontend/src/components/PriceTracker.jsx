import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Badge } from 'react-bootstrap';
import { productsAPI } from '../services/api';

const PriceTracker = () => {
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    url: '',
    platform: 'Amazon',
    currency: 'INR',
    currentPrice: '',
    targetPrice: '',
    specifications: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Auto-select currency based on platform
    if (name === 'platform') {
      let currency = 'INR';
      if (value === 'eBay') {
        currency = 'USD';
      } else if (value === 'Amazon' || value === 'Flipkart') {
        currency = 'INR';
      }
      setNewProduct({ ...newProduct, [name]: value, currency: currency });
    } else {
      setNewProduct({ ...newProduct, [name]: value });
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();

    // Validate prices before sending
    if (newProduct.targetPrice && newProduct.currentPrice &&
      parseFloat(newProduct.targetPrice) >= parseFloat(newProduct.currentPrice)) {
      const currencySymbol = newProduct.currency === 'USD' ? '$' : '₹';
      alert(`Target price (${currencySymbol}${newProduct.targetPrice}) must be lower than current price (${currencySymbol}${newProduct.currentPrice}).`);
      return;
    }

    try {
      await productsAPI.create(newProduct);
      setShowModal(false);
      setNewProduct({
        name: '',
        url: '',
        platform: 'Amazon',
        currency: 'INR',
        currentPrice: '',
        targetPrice: '',
        specifications: ''
      });
      fetchProducts();
      alert('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      alert(error.response?.data?.message || 'Error adding product. Please try again.');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productsAPI.delete(id);
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2 className="text-dark">Price Tracker</h2>
            <Button variant="primary" onClick={() => setShowModal(true)}>
              + Add Product
            </Button>
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Platform</th>
                    <th>Current Price</th>
                    <th>Target Price</th>
                    <th>Specifications</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center">
                        No products tracked yet. Add your first product!
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product._id}>
                        <td>
                          <a href={product.url} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-none">
                            {product.name} 🔗
                          </a>
                        </td>
                        <td>
                          <Badge bg="info">{product.platform}</Badge>
                        </td>
                        <td>
                          <strong>
                            {product.currency === 'USD' ? '$' : '₹'}{product.currentPrice}
                          </strong>
                        </td>
                        <td>
                          {product.currency === 'USD' ? '$' : '₹'}{product.targetPrice || 'N/A'}
                        </td>
                        <td>
                          <small className="text-muted">
                            {product.specifications ?
                              (product.specifications.length > 50 ?
                                product.specifications.substring(0, 50) + '...' :
                                product.specifications
                              ) :
                              'N/A'
                            }
                          </small>
                        </td>
                        <td>
                          {product.targetPrice && product.currentPrice <= product.targetPrice ? (
                            <Badge bg="success">Target Met!</Badge>
                          ) : (
                            <Badge bg="secondary">Tracking</Badge>
                          )}
                        </td>
                        <td>{new Date(product.lastChecked).toLocaleDateString()}</td>
                        <td>
                          <Button
                            variant="info"
                            size="sm"
                            className="me-2"
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowDetailModal(true);
                            }}
                          >
                            View
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteProduct(product._id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Add Product Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add New Product</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddProduct}>
            <Form.Group className="mb-3">
              <Form.Label>Product Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={newProduct.name}
                onChange={handleInputChange}
                placeholder="e.g., iPhone 15 Pro"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Product URL</Form.Label>
              <Form.Control
                type="url"
                name="url"
                value={newProduct.url}
                onChange={handleInputChange}
                placeholder="https://amazon.in/product-link"
                required
              />
              <Form.Text className="text-muted">
                Paste the full product URL from the e-commerce site
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Platform</Form.Label>
              <Form.Select
                name="platform"
                value={newProduct.platform}
                onChange={handleInputChange}
              >
                <option value="Amazon">Amazon (India)</option>
                <option value="Flipkart">Flipkart (India)</option>
                <option value="eBay">eBay (USA)</option>
                <option value="Other">Other</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Currency</Form.Label>
              <Form.Select
                name="currency"
                value={newProduct.currency}
                onChange={handleInputChange}
              >
                <option value="INR">₹ INR (Indian Rupee)</option>
                <option value="USD">$ USD (US Dollar)</option>
              </Form.Select>
              <Form.Text className="text-muted">
                Currency is auto-selected based on platform, but you can change it
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                Current Price in {newProduct.currency === 'USD' ? '$' : '₹'}
              </Form.Label>
              <Form.Control
                type="number"
                name="currentPrice"
                value={newProduct.currentPrice}
                onChange={handleInputChange}
                step="0.01"
                placeholder={`Enter current market price in ${newProduct.currency === 'USD' ? 'USD' : 'INR'}`}
                required
              />
              <Form.Text className="text-muted">
                Enter the current price you see on the website
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Specifications (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="specifications"
                value={newProduct.specifications}
                onChange={handleInputChange}
                placeholder="e.g., 256GB, Black, 6.1 inch display, A17 Pro chip"
              />
              <Form.Text className="text-muted">
                Enter key specifications like storage, color, features, etc.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                Target Price in {newProduct.currency === 'USD' ? '$' : '₹'} (Optional)
              </Form.Label>
              <Form.Control
                type="number"
                name="targetPrice"
                value={newProduct.targetPrice}
                onChange={handleInputChange}
                step="0.01"
                placeholder={`Enter your desired price in ${newProduct.currency === 'USD' ? 'USD' : 'INR'}`}
              />
              <Form.Text className="text-muted">
                Set a price lower than the current price. You'll be notified when the price drops to this level.
              </Form.Text>
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Add Product
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Product Details Modal */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Product Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProduct && (
            <div>
              <h5>{selectedProduct.name}</h5>
              <hr />

              <Row className="mb-3">
                <Col md={6}>
                  <strong>Platform:</strong>
                  <br />
                  <Badge bg="info" className="mt-1">{selectedProduct.platform}</Badge>
                </Col>
                <Col md={6}>
                  <strong>Status:</strong>
                  <br />
                  {selectedProduct.targetPrice && selectedProduct.currentPrice <= selectedProduct.targetPrice ? (
                    <Badge bg="success" className="mt-1">Target Met!</Badge>
                  ) : (
                    <Badge bg="secondary" className="mt-1">Tracking</Badge>
                  )}
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <strong>Current Price:</strong>
                  <br />
                  <h4 className="text-success">
                    {selectedProduct.currency === 'USD' ? '$' : '₹'}{selectedProduct.currentPrice}
                  </h4>
                </Col>
                <Col md={6}>
                  <strong>Target Price:</strong>
                  <br />
                  <h4 className="text-primary">
                    {selectedProduct.currency === 'USD' ? '$' : '₹'}{selectedProduct.targetPrice || 'Not Set'}
                  </h4>
                </Col>
              </Row>

              <div className="mb-3">
                <strong>Currency:</strong>
                <br />
                <Badge bg="warning" text="dark" className="mt-1">
                  {selectedProduct.currency === 'USD' ? '$ USD' : '₹ INR'}
                </Badge>
              </div>

              <div className="mb-3">
                <strong>Product URL:</strong>
                <br />
                <a href={selectedProduct.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary btn-sm mt-1">
                  🔗 Visit Product Page
                </a>
              </div>

              <div className="mb-3">
                <strong>Specifications:</strong>
                <div className="p-3 bg-light rounded mt-2">
                  {selectedProduct.specifications || 'No specifications provided'}
                </div>
              </div>

              <div className="mb-3">
                <strong>Last Checked:</strong> {new Date(selectedProduct.lastChecked).toLocaleString()}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PriceTracker;