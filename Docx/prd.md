# Product Requirements Document (PRD)

## Project Name

**Intermediate E-commerce Website**

## Technology Stack

### Frontend

* React.js
* React Router
* Axios
* Context API / Redux

### Backend

* Node.js
* Express.js
* JWT Authentication
* Bcrypt Password Hashing

### Database

* Microsoft SQL Server (MSSQL)

---

# Project Objective

Develop a full-stack e-commerce platform allowing customers to browse products, manage carts, place orders, and enabling administrators to manage products, inventory, coupons, and orders.

The project includes source code only.

Hosting, deployment, domain, SSL, cloud infrastructure, and maintenance are excluded.

---

# Scope

## Customer Features

### Authentication

* User Registration
* User Login
* User Logout
* JWT Authentication

### Product Catalog

* View Products
* Product Search
* Category Filtering
* Product Details Page

### Shopping Cart

* Add to Cart
* Update Quantity
* Remove Item
* Cart Persistence

### Address Management

* Add Address
* Edit Address
* Delete Address

### Checkout

* Address Selection
* Coupon Application
* Order Placement

### Orders

* View Order History
* View Order Status

---

## Admin Features

### Dashboard

* Total Products
* Total Orders
* Total Customers
* Revenue Summary

### Category Management

* Create Category
* Update Category
* Delete Category

### Product Management

* Add Product
* Edit Product
* Delete Product
* Product Image Management

### Inventory Management

* Stock Updates
* Inventory Tracking

### Order Management

* View Orders
* Update Order Status
* Update Payment Status

### Coupon Management

* Create Coupon
* Update Coupon
* Activate/Deactivate Coupon

---

# User Roles

## Customer

Can:

* Browse products
* Manage cart
* Place orders
* View order history

Cannot:

* Access admin modules

## Admin

Can:

* Manage products
* Manage inventory
* Manage categories
* Manage coupons
* Manage orders
* Access dashboard

---

# Functional Requirements

## Authentication Module

### Registration

Users can create accounts using:

* Name
* Email
* Password

### Login

Users can authenticate using:

* Email
* Password

### Security

Passwords stored using bcrypt hashing.

---

## Product Module

### Product Fields

* Product ID
* Product Name
* Description
* Category
* Price
* SKU
* Stock Quantity
* Images
* Status

### Features

* Product Listing
* Product Search
* Product Filtering
* Product Details

---

## Cart Module

Users can:

* Add Product
* Remove Product
* Change Quantity
* View Cart Total

---

## Order Module

### Order Creation

System should:

* Validate stock
* Create order
* Create order items
* Deduct inventory

### Order Status

Available statuses:

* Pending
* Paid
* Processing
* Shipped
* Delivered
* Cancelled

---

## Coupon Module

### Coupon Fields

* Coupon Code
* Discount Type
* Discount Value
* Expiry Date
* Minimum Order Amount

### Coupon Features

* Apply Coupon
* Validate Coupon
* Calculate Discount

---

## Payment Module

### Supported Statuses

* Pending
* Success
* Failed

### Stored Information

* Transaction ID
* Amount
* Payment Method
* Payment Status

---

# Database Modules

### Roles

Stores system roles.

### Users

Stores customer and admin accounts.

### Addresses

Stores shipping addresses.

### Categories

Stores product categories.

### Products

Stores product information.

### Product Images

Stores product image URLs.

### Cart

Stores user cart items.

### Coupons

Stores discount coupons.

### Orders

Stores customer orders.

### Order Items

Stores products within orders.

### Payments

Stores payment records.

---

# API Modules

## Auth APIs

```http
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
```

## Product APIs

```http
GET /api/products
GET /api/products/:id
POST /api/products
PUT /api/products/:id
DELETE /api/products/:id
```

## Cart APIs

```http
GET /api/cart
POST /api/cart
PUT /api/cart/:id
DELETE /api/cart/:id
```

## Order APIs

```http
POST /api/orders
GET /api/orders
GET /api/orders/:id
```

## Admin APIs

```http
GET /api/admin/dashboard
GET /api/admin/orders
PUT /api/admin/orders/:id
```

---

# Non-Functional Requirements

## Performance

* Database connection pooling
* API response time under 500ms for common operations

## Security

* JWT Authentication
* Password Hashing
* Input Validation
* Parameterized SQL Queries
* Role-Based Access Control

## Reliability

* Error Handling Middleware
* Transaction Support
* Database Reconnection Logic

## Maintainability

* Modular Architecture
* Environment Configuration
* Centralized Logging

---

# Deliverables

### Included

* React Frontend Source Code
* Node.js Backend Source Code
* MSSQL Database Schema
* API Documentation
* Setup Guide
* Environment Configuration Template

### Excluded

* Hosting
* Domain Purchase
* SSL Certificates
* Deployment
* Cloud Infrastructure
* Production Monitoring
* Ongoing Maintenance

---

# Acceptance Criteria

Project is considered complete when:

* User registration works
* User login works
* Products can be managed
* Products can be searched
* Cart functions correctly
* Orders can be placed
* Admin dashboard works
* Coupons work
* MSSQL schema executes successfully
* Source code is delivered

---

# Timeline

Estimated Development Time:

* Backend Development: 25–30 Hours
* Frontend Development: 20–25 Hours
* Database Design: 5–8 Hours
* Testing & Bug Fixing: 10–15 Hours

**Total: 60–80 Hours**

---

# Commercial Proposal

### Project Cost

**₹17,000**

### Justification

The pricing covers:

* Full-stack application development
* Database design
* API development
* Authentication system
* Product management
* Cart management
* Order processing
* Admin dashboard
* Testing and debugging
* Documentation
* Complete source code handover

Infrastructure, hosting, deployment, domain, and operational support are not included in the quoted amount.
