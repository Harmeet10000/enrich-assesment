
# 🚦 Enrich Assignment (API Gateway for External Data Vendors)

Repository: [https://github.com/Harmeet10000/enrich-assesment.git](https://github.com/Harmeet10000/enrich-assesment.git)


**Postman Collection:** [View/Import Collection](https://shikshadost.postman.co/workspace/ShikshaDost-Workspace~8e7d6bc8-e595-4500-8ba7-770b152883a6/collection/28263775-c9443c7d-e516-43ff-a3bb-5e9f768e6af3?action=share&creator=28263775)

**Load Testing:**

Used [`wrk`](https://github.com/wg/wrk) for high-concurrency load testing. Example command and results:

```bash
wrk -t8 -c200 -d60s -s wrk_load_test.lua http://localhost:8000
```

Results:

```
Running 1m test @ http://localhost:8000
  8 threads and 200 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency   605.79ms  111.45ms   2.00s    84.28%
    Req/Sec    41.15     19.57   170.00     69.48%
  18416 requests in 1.00m, 23.27MB read
  Socket errors: connect 0, read 0, write 0, timeout 149
  Non-2xx or 3xx responses: 172
Requests/sec:    306.63
Transfer/sec:    396.69KB
5667 documents inserted in mongoDB
```

**Observation:**

Even after the wrk test finished, logs continued to appear in the API container. This is expected, as jobs submitted during the test are still being processed asynchronously by the background worker(s) managed by BullMQ.


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

- Node.js (v22+ recommended)
- npm
- MongoDB (running)
- Redis (running)

### Installation

```bash
git clone https://github.com/Harmeet10000/enrich-assesment.git
cd enrich-assesment
cp .env.dev 
# Edit .env as needed (MongoDB/Redis connection details)
npm install
```


### Configuration

Copy and edit your `.env` file as needed. Example:

```env
NODE_ENV=development
PORT=8000
SERVER_URL=http://localhost:8000

# Database Configuration
DATABASE=mongodb://mongodb:27017/api-service
MIGRATE_MONGO_URI=mongodb://localhost:27018/api-service
DB_POOL_SIZE=10

# Migration
MIGRATE_AUTOSYNC=true

# Redis Configuration
REDIS_HOST=bullmq
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=
```

---


## 🏃 Project Setup & Running with Docker Compose

You can pull the prebuilt Docker image and run the entire stack using Docker Compose. No need to run any npm scripts manually.

**1. Clone the repository:**

```bash
git clone https://github.com/Harmeet10000/enrich-assesment.git
cd enrich\ assignment
```

**2. Copy and edit your .env file:**

```bash
cp .env.dev .env
# Edit .env as needed (see above)
```

**3. Pull the latest Docker image**

```bash
docker compose pull
```

**4. Start all services:**

```bash
docker compose up -d
```

This will start MongoDB, Redis, the API service, Prometheus, and Grafana. The API and worker are managed together—no need to run `npm run worker`.

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
| `npm start`             | Start the production server                  |
| `npm test`              | Run the test suite                           |
| `npm run lint`          | Check code for linting errors                |
| `npm run format`        | Check code formatting                        |


</details>

## 🔒 Security Features

<details open>
<summary><b>🔐 Security Implementation</b></summary>
<br/>

- **Rate Limiting**: Protection against brute force attacks
- **Data Validation**: Joi schemas for request validation
- **HTTP Security Headers**: Using Helmet middleware
- **MongoDB Sanitization**: Protection against NoSQL injection
- **XSS Protection**: Sanitization of user input

</details>


---

## 🚧 Further Improvements

- Implement job prioritization if needed
- Implement a mechanism to handle job duplicates
- Tune BullMQ worker concurrency and rate limiting based on vendor capabilities
- Improve Prometheus metrics collection and dashboarding (current setup has limited charts; more custom metrics and Grafana dashboards can be added)
- Integrate Loki for centralized log aggregation and visualization alongside Grafana

