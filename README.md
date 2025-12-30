# UnScoot Application

**UnScoot** is a robust, on-demand multi-service platform specifically designed for the **Solo (Surakarta)** region, with a primary focus on serving the **Universitas Sebelas Maret (UNS)** community. Developed using **React Native (Expo)** and **Supabase (PostgreSQL)**, this application provides a tailored transportation and logistics ecosystem for students and local residents.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Target Demographics & Scope](#target-demographics--scope)
3. [Key Features](#key-features)
4. [Technical Architecture](#technical-architecture)
5. [Performance Benchmarks](#performance-benchmarks)
6. [Installation & Setup](#installation--setup)

---

## System Overview

UnScoot bridges the gap between campus mobility needs and local service providers. It is built to operate efficiently within the specific geographic context of Solo, ensuring reliable connectivity between campus areas (Kentingan, Kleco, Pabelan) and the broader city. Key modules include:

*   **ScootRide**: Campus-friendly transport service connecting dormitories, faculties, and city landmarks.
*   **ScootFood**: Curated food delivery from local "warung" and student-favorite merchants around Solo.
*   **ScootSend**: Intra-city logistics for effective document and package transfer between students and faculties.

---

## Target Demographics & Scope

*   **Primary Users**: UNS Students (Mahasiswa) and Civitas Akademika.
*   **Service Area**: Surakarta (Solo) City and surrounding districts (Kartasura, Palur).
*   **Objective**: To provide an affordable, community-driven alternative to mainstream ride-hailing apps, optimized for the unique constraints and routes of student life in Solo.

---

## Key Features

### 1. Real-Time Interactions
Utilizes Supabase Realtime (WebSockets) to deliver instantaneous updates for:
*   Driver location changes using geospatial data.
*   Order status transitions (e.g., Pending → Accepted → Completed).
*   In-app chat messaging between customers and drivers.

### 2. Geolocation Services
Integrated with React Native Maps to provide:
*   Precision pickup and drop-off coordinate selection tailored for Solo's street layout.
*   Route visualization and distance calculation.
*   Reverse geocoding for address resolution.

### 3. Secure Authentication
Implements robust authentication flows supporting:
*   Email/Password registration and login.
*   Role-based access control (RBAC) distinguishing between `Customer` and `Driver` entities.

---

## Technical Architecture

The project adheres to modern development practices and utilizes the following technology stack:

*   **Frontend Framework**: React Native (v0.74+) with Expo SDK 52.
*   **Routing**: Expo Router (File-based routing system).
*   **Backend as a Service (BaaS)**: Supabase.
    *   **Database**: PostgreSQL 15.
    *   **Authentication**: Supabase Auth (JWT).
    *   **Storage**: Supabase Storage for media assets.
*   **State Management**: React Context API & Custom Hooks.
*   **External Integrations**:
    *   **Brevo SMTP**: For transactional emails (OTP, receipts).

---

## Performance Benchmarks

The application backend successfully passed load testing conducted in **December 2025**.

**Test Environment**: Production
**Methodology**: Node.js automated stress testing suite targeting core REST API endpoints.

| Metric | Result | Description |
| :--- | :--- | :--- |
| **Max Concurrent Users** | **600** | Sustained load suitable for peak campus hours. |
| **Average Response Time** | **< 100ms** | For standard read operations (Chat, Orders). |
| **Throughput** | **8.1 req/s** | Average request processing rate under consistent load. |
| **Success Rate** | **95.67%** | Reliability at peak load (600 concurrent users). |

---

## Installation & Setup

### Prerequisites
*   Node.js (LTS version recommended)
*   npm or yarn
*   Expo CLI

### Steps

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/Start-Z/UnScoot.git
    cd UnScoot
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory based on the provided template. Populating the variables with valid credentials is required for the application to function.
    ```bash
    cp .env.example .env
    ```

4.  **Run Development Server**
    ```bash
    npx expo start -c
    ```

---

&copy; 2025 UnScoot Project - Solo, Indonesia. All Rights Reserved.
