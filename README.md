# 🚦 API Gateway for External Data Vendors

A robust, scalable API Gateway that abstracts the complexities of integrating with multiple external data vendors. It provides unified endpoints, background job processing, distributed rate limiting, and a clean architecture for maintainability and extensibility.

---

## ✨ Features

- **Unified Job Submission**: `POST /jobs` accepts any JSON payload and returns a `request_id` for tracking.
- **Background Processing**: Jobs are queued and processed asynchronously, supporting both synchronous and asynchronous vendor integrations.
- **Webhook Support**: Dedicated endpoint for async vendors to push final data and mark jobs as complete.
- **Job Status Polling**: `GET /jobs/{request_id}` allows clients to poll for job status and results.
- **Distributed Rate Limiting**: Per-vendor rate limits enforced via Redis-backed mechanisms.
- **Clean Architecture**: Separation of concerns across routes, controllers, services, repository, helpers, and db layers.
- **Scalable & Reliable**: Built with Node.js, BullMQ (Redis-backed), and MongoDB for high throughput and resilience.

---

## 🏗️ Architecture Overview

```
+------------------+     +-----------------+     +-----------------+
|                  |     |                 |     |                 |
|   Frontend/      +----->  API Gateway    +----->  BullMQ Queue   |
|   Internal Teams |     |  (Express.js)   |     |  (Redis-backed) |
|                  |     |                 |     |                 |
+------------------+     +--------+--------+     +--------+--------+
      ^                         |                         |
      |                         |                         |
      | (Polling)               | (Job Creation)          | (Job Consumption)
      |                         |                         |
      |                         v                         v
+-----+------------+     +-----------------+     +-----------------+
|                  |     |                 |     |                 |
|  MongoDB         <-----+  Job Repository |<----+  Background     |
|  (Job State)     |     |  (Mongoose)     |     |  Worker (BullMQ)|
|                  |     |                 |     |                 |
+------------------+     +-----------------+     +--------+--------+
                                                          |
                                                          | (Vendor Calls, Rate Limit)
                                                          v
                                                  +-----------------+
                                                  |                 |
                                                  | Mock Vendors    |
                                                  | (Sync / Async)  |
                                                  |                 |
                                                  +--------+--------+
                                                           ^
                                                           | (Webhook for Async)
                                                           |
                                                  +--------+--------+
                                                  |                 |
                                                  | Vendor Webhook  |
                                                  | (Express.js)    |
                                                  |                 |
                                                  +-----------------+
```

---

## ⚖️ Key Design Decisions & Trade-offs

- **Node.js**: Chosen for its async, event-driven model—ideal for I/O-bound API gateway workloads.
- **BullMQ (Redis-backed)**: Native Node.js integration, built-in job management, and distributed rate limiting. Relies on Redis, which is fast but a critical dependency.
- **Redis for Rate Limiting**: Ensures consistent per-vendor limits across horizontally scaled workers.
- **MongoDB**: Flexible NoSQL store for diverse job payloads and evolving schemas.
- **Functional Programming Style**: Promotes modularity, testability, and maintainability.
- **Separation of Concerns**: Clear folder structure for scalability and clarity.
- **Webhook for Async Vendors**: Enables push-based completion for long-running vendor jobs.

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v18+ recommended)
- npm
- MongoDB (running)
- Redis (running)

### Installation

```bash
git clone <repository_url>
cd api-gateway
cp .env.example .env
# Edit .env as needed (MongoDB/Redis connection details)
npm install
```

### Configuration

Edit your `.env` file as needed:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/api_gateway_db
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## 🏃 Running the Application

The system consists of two main processes: the API server and the background worker. Run each in a separate terminal.

**Start the API Server:**

```bash
npm start
```

**Start the Background Worker:**

```bash
npm run worker
```

You can run multiple worker instances for horizontal scaling.

---

## 📚 API Endpoints

### 1. Create a New Job

**POST `/jobs`**

Accepts a vendor payload and returns a `request_id`.

**Example (Sync Vendor):**

```bash
curl -X POST http://localhost:3000/jobs \
  -H 'Content-Type: application/json' \
  -d '{
    "vendorType": "sync",
    "vendorPayload": {
      "productId": "PROD-ABC-123",
      "action": "fetch_details"
    }
  }'
```

**Example (Async Vendor):**

```bash
curl -X POST http://localhost:3000/jobs \
  -H 'Content-Type: application/json' \
  -d '{
    "vendorType": "async",
    "vendorPayload": {
      "userId": "USER-XYZ-456",
      "reportType": "monthly_sales"
    }
  }'
```

**Response:**

```json
{ "request_id": "your-generated-uuid" }
```

---

### 2. Get Job Status

**GET `/jobs/{request_id}`**

Poll for job status and results.

```bash
curl -X GET http://localhost:3000/jobs/your-generated-uuid
```

**Possible Responses:**

- **Pending/Processing:**
  ```json
  { "status": "pending" }
  ```
  or
  ```json
  { "status": "processing" }
  ```

- **Complete:**
  ```json
  {
    "status": "complete",
    "result": {
      "status": "success",
      "vendor": "syncVendor",
      "data": "Processed sync data for PROD-ABC-123",
      "timestamp": "2023-10-27T10:00:00.000Z",
      "originalPayload": { "productId": "PROD-ABC-123", "action": "fetch_details" }
    }
  }
  ```

- **Failed:**
  ```json
  { "status": "failed", "error": "Error message details" }
  ```

- **Not Found:**
  ```json
  { "message": "Job not found" }
  ```

---

## 📈 Load Testing with k6

A `k6_load_test.js` script is included for performance/load testing.

### How to Run

1. [Install k6](https://k6.io/docs/getting-started/installation/)
2. Ensure both API server and worker are running.
3. Run the test:

```bash
k6 run k6_load_test.js
```

### Script Highlights

- Simulates a mix of `POST /jobs` and `GET /jobs/{request_id}` requests.
- 200 concurrent virtual users for 60 seconds.
- Checks for latency, error rates, and endpoint correctness.

---

## 📊 Load Test Results & Analysis

- **POST /jobs**: Should have low latency (<50ms), confirming fast job offloading.
- **GET /jobs/{request_id}**: Slightly higher latency due to DB lookups, but should remain performant.
- **Error Rates**: Should be <1%. Higher rates indicate infrastructure or code issues.
- **Rate Limiting**: Worker logs should show rate limit enforcement and job re-queuing.
- **Scalability**: Multiple workers distribute jobs, demonstrating horizontal scaling.

---

## 🗂️ Project Structure

```
api-gateway/
├── src/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── repository/
│   ├── helpers/
│   ├── db/
│   └── ...
├── k6_load_test.js
├── .env.example
└── ...
```




<div align="center">

**Built with ❤️ for scalable, reliable data integrations.**

</div>

</details>

## ⚙️ Configuration

<details>
<summary><b>📄 Configuration Files</b></summary>
<br/>

- **webpack.config.js**: Configures bundling for production deployment
- **eslint.config.js**: JavaScript linting rules
- **commitlint.config.js**: Conventional commit message validation
- **test-runner.js**: Test runner configuration
- **prometheus.yml**: Prometheus monitoring configuration

</details>

## 🛠️ Available Scripts

<details open>
<summary><b>📋 NPM Commands</b></summary>
<br/>

| Command                 | Description                                  |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Start the development server with hot reload |
| `npm run build`         | Build the production bundle                  |
| `npm run dev:prod`      | Run production build with nodemon            |
| `npm start`             | Start the production server                  |
| `npm run swagger`       | Generate Swagger documentation               |
| `npm test`              | Run the test suite                           |
| `npm run test:watch`    | Run tests in watch mode                      |
| `npm run test:coverage` | Run tests with coverage report               |
| `npm run lint`          | Check code for linting errors                |
| `npm run lint:fix`      | Fix linting errors automatically             |
| `npm run format`        | Check code formatting                        |
| `npm run format:fix`    | Fix formatting issues automatically          |
| `npm run migrate:dev`   | Run database migrations in development       |
| `npm run migrate:prod`  | Run database migrations in production        |

</details>

## 🔒 Security Features

<details open>
<summary><b>🔐 Security Implementation</b></summary>
<br/>

- **JWT Authentication**: Secure token-based authentication with refresh token rotation
- **Password Security**: Bcrypt hashing with appropriate salt rounds
- **Rate Limiting**: Protection against brute force attacks
- **Data Validation**: Joi schemas for request validation
- **HTTP Security Headers**: Using Helmet middleware
- **Cookie Security**: HTTP-only, secure cookies with proper domain and path settings
- **MongoDB Sanitization**: Protection against NoSQL injection
- **XSS Protection**: Sanitization of user input

</details>

## 🧪 Testing

<details>
<summary><b>🧠 Test Commands</b></summary>
<br/>

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate test coverage report:

```bash
npm run test:coverage
```

</details>

## 🔄 API Endpoints

<details>
<summary><b>🔑 Authentication Routes</b></summary>
<br/>

- `POST /api/v1/auth/register` - Register new user
- `PUT /api/v1/auth/confirmation/:token` - Confirm user account
- `POST /api/v1/auth/login` - Login user
- `PUT /api/v1/auth/logout` - Logout user
- `POST /api/v1/auth/refresh-token` - Generate new access token
- `PUT /api/v1/auth/forgot-password` - Request password reset
- `PUT /api/v1/auth/reset-password/:token` - Reset password
- `PUT /api/v1/auth/change-password` - Change password (authenticated)

</details>

<details>
<summary><b>🩺 Health Routes</b></summary>
<br/>

- `GET /api/v1/health` - Check API health
- `GET /api/v1/health/db` - Check database connection
- `GET /api/v1/health/redis` - Check Redis connection

</details>

## 🤝 Contributing

<details>
<summary><b>📜 Contribution Guidelines</b></summary>
<br/>

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

</details>

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

---

<div align="center">

### ⭐ Star this repository if you find it useful! ⭐

Created with ❤️ by [Harmeet Singh](https://github.com/yourusername)

<a href="#top">⬆️ Back to top ⬆️</a>

</div>
