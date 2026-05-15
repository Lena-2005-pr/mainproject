# HomeNurseBooking

HomeNurseBooking is a full-stack nurse booking platform with separate experiences for guests, users, home nurses, and admins. The frontend is a React + Vite application, and the backend is a Node.js + Express + MongoDB API using Mongoose.

This README is based on the current codebase in this repository as analyzed on April 1, 2026.

## Project Abstract

The system is designed to help families book home nursing services and help nurses manage bookings and subscriptions.

Core flow:

1. Guests can browse the landing page, register as a user or home nurse, log in, and submit public feedback.
2. Admins can review pending home nurse registrations, manage districts, places, subscription plans, complaints, and view dashboard metrics.
3. Users can browse approved nurses, create bookings, pay advances, manage their profile, raise complaints, and view notifications.
4. Home nurses can manage profile details, view subscription plans, receive booking requests, accept or reject work, and track notifications.

## Architecture Summary

### Frontend

- Stack: React 19, Vite, React Router, Axios, MUI, GSAP, SweetAlert2
- Entry point: [client/src/main.jsx](/d:/HomenurseBooking%20Latest/HomenurseBooking/client/src/main.jsx)
- Main route switch: [client/src/Routes/MainRoutes.jsx](/d:/HomenurseBooking%20Latest/HomenurseBooking/client/src/Routes/MainRoutes.jsx)
- Role-based layouts:
  - [client/src/Guest/GuestLayout/GuestLayout.jsx](/d:/HomenurseBooking%20Latest/HomenurseBooking/client/src/Guest/GuestLayout/GuestLayout.jsx)
  - [client/src/User/UserLayout/UserLayout.jsx](/d:/HomenurseBooking%20Latest/HomenurseBooking/client/src/User/UserLayout/UserLayout.jsx)
  - [client/src/HomeNurse/HomeNurseLayout/HomeNurseLayout.jsx](/d:/HomenurseBooking%20Latest/HomenurseBooking/client/src/HomeNurse/HomeNurseLayout/HomeNurseLayout.jsx)
  - [client/src/Admin/AdminLayout/AdminLayout.jsx](/d:/HomenurseBooking%20Latest/HomenurseBooking/client/src/Admin/AdminLayout/AdminLayout.jsx)

### Backend

- Stack: Node.js, Express 5, Mongoose, Multer, CORS
- Main server file: [server/index.js](/d:/HomenurseBooking%20Latest/HomenurseBooking/server/index.js)
- Current backend design: a single monolithic Express file that contains:
  - server bootstrapping
  - MongoDB connection
  - file upload setup
  - all Mongoose schemas/models
  - all API routes

## Module Count

Because "modules" can mean different things, here are the practical counts from this repo:

- `2` top-level applications: `client`, `server`
- `7` top-level frontend source modules/domains inside `client/src`:
  - `Admin`
  - `Guest`
  - `User`
  - `HomeNurse`
  - `Basics`
  - `Routes`
  - `assets`
- `4` main business role modules:
  - Guest
  - User
  - HomeNurse
  - Admin
- `61` JSX source modules in the frontend
- `1` backend source module currently drives the entire API: [server/index.js](/d:/HomenurseBooking%20Latest/HomenurseBooking/server/index.js)

Frontend JSX breakdown:

- `19` admin JSX files
- `8` guest JSX files
- `12` user JSX files
- `11` home nurse JSX files
- `3` basics/demo JSX files
- `6` route JSX files

## Schema Count

The backend currently defines `12` Mongoose schemas, all inside [server/index.js](/d:/HomenurseBooking%20Latest/HomenurseBooking/server/index.js):

1. `District`
2. `Experience`
3. `AdminReg`
4. `User`
5. `HomeNurse`
6. `Place`
7. `Subscriptiontype`
8. `Booking`
9. `Subscription`
10. `Complaint`
11. `Feedback`
12. `Notification`

## Functional Areas

### Guest Module

- Landing page/dashboard
- User registration
- Home nurse registration
- Login
- Public feedback submission

### User Module

- User dashboard/home
- Profile view and edit
- Change password
- Browse approved nurses
- Create booking with date blocking
- View own bookings
- Advance payment flow
- Complaint submission
- User notifications

### Home Nurse Module

- Home nurse dashboard
- Experience management
- View subscription plans
- Subscribe to a plan
- Profile view and edit
- Change password
- View booking requests
- Accept, reject, and complete bookings
- Nurse notifications

### Admin Module

- Dashboard analytics
- District management
- Place management
- Home nurse verification
- Subscription type management
- Complaint viewing and replying
- Feedback viewing
- Admin registration

## API Overview

Main API groups found in [server/index.js](/d:/HomenurseBooking%20Latest/HomenurseBooking/server/index.js):

- Authentication:
  - `/login`
- Master data:
  - `/district`
  - `/place`
  - `/experience`
  - `/subscriptiontype`
- Account management:
  - `/adminreg`
  - `/user`
  - `/homenurse`
  - `/approve/:id`
  - `/reject/:id`
  - `/pending`
  - `/approvednurses`
- Booking:
  - `/booking`
  - `/booking/nurse/:id`
  - `/booking/unavailable/:homenurseId`
  - `/booking/accept/:id`
  - `/booking/reject/:id`
  - `/booking/advance/:id`
  - `/paymentcomplete/:id`
  - `/booking/complete/:id`
  - `/user-bookings/:userId`
- Subscription:
  - `/subscription`
- Complaint:
  - `/complaint`
  - `/complaint/reply/:id`
  - `/complaint/user/:uid`
- Feedback:
  - `/feedback`
- Notifications:
  - `/notifications/user/:userId`
  - `/notifications/nurse/:homenurseId`
  - `/notifications/read/:id`
  - `/notifications/read-all/user/:userId`
  - `/notifications/read-all/nurse/:homenurseId`
  - `/notifications/unread/user/:userId`
  - `/notifications/unread/nurse/:homenurseId`

## Folder Structure

```text
HomenurseBooking/
|-- client/
|   |-- public/
|   |-- src/
|   |   |-- Admin/
|   |   |-- Guest/
|   |   |-- HomeNurse/
|   |   |-- User/
|   |   |-- Basics/
|   |   |-- Routes/
|   |   |-- App.jsx
|   |   `-- main.jsx
|   |-- package.json
|   `-- vite.config.js
|-- server/
|   |-- public/uploads/
|   |-- index.js
|   `-- package.json
`-- README.md
```

## Current Implementation Notes

The codebase is functional in concept, but there are some important structural observations:

- The backend is centralized in one large file of about `1295` lines, which makes maintenance harder.
- The MongoDB connection string is hardcoded directly in [server/index.js](/d:/HomenurseBooking%20Latest/HomenurseBooking/server/index.js) instead of using environment variables.
- Uploaded files are stored in `server/public/uploads`; the repository currently contains `54` uploaded files.
- Some admin pages exist on the client, but corresponding backend schemas/routes are not present for all of them. Examples include `Category`, `Brand`, `Type`, and `Subcategory`.
- [client/src/App.jsx](/d:/HomenurseBooking%20Latest/HomenurseBooking/client/src/App.jsx) is present but not used by the main boot flow.
- There are booking status mismatches between some client screens and the backend enum flow, so parts of the booking/payment UI may not fully reflect server state transitions.

## Tech Stack

### Client

- React
- Vite
- React Router
- Axios
- MUI
- GSAP
- SweetAlert2
- React Datepicker

### Server

- Node.js
- Express
- MongoDB
- Mongoose
- Multer
- CORS

## How To Run

### Client

```bash
cd client
npm install
npm run dev
```

### Server

```bash
cd server
npm install
npm run dev
```

Default local ports used in code:

- Client: Vite default dev port
- Server: `http://localhost:5000`

## Recommended Next Refactor Steps

1. Split [server/index.js](/d:/HomenurseBooking%20Latest/HomenurseBooking/server/index.js) into `models`, `routes`, `controllers`, and `middleware`.
2. Move secrets and DB configuration to `.env`.
3. Normalize booking status handling so client and server use the same state mapping.
4. Either implement or remove unfinished admin domains such as category/brand/type/subcategory.
5. Add validation, authentication, password hashing, and role-based authorization.
6. Add tests for booking, login, subscription, and complaint flows.

## Summary

This repository is a role-based home nurse booking system with a fairly rich frontend and a single-file backend. At present, the clearest counts are:

- `2` top-level apps
- `4` main business modules
- `61` frontend JSX modules
- `12` backend schemas
- `1` monolithic backend API file

That makes the project a solid functional prototype with clear room for backend modularization and production hardening.
