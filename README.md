# Venkateswara Marine Electrical Works - Invoice Generator

A complete invoice generation system for Venkateswara Marine Electrical Works built with React, Firebase, and MongoDB.

## Features

- User authentication with Firebase
- Custom letterhead design
- Invoice generation with dynamic data
- Flexible tax options (SGST/CGST or IGST)
- Year-wise invoice organization
- Inventory management
- Payment status tracking
- PDF generation and printing

## Tech Stack

- **Frontend:** React, Tailwind CSS, TypeScript
- **State Management:** Zustand
- **Authentication:** Firebase Authentication
- **Data Storage:** Firebase Firestore (inventory, default info), MongoDB Cloud (invoices)
- **PDF Generation:** jsPDF

## Setup Instructions

### Prerequisites

- Node.js and npm installed
- Firebase account
- MongoDB Atlas account (for production deployment)

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/vmew-invoice-generator.git
   cd vmew-invoice-generator
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file based on the `.env.example` provided
   ```
   cp .env.example .env
   ```

4. Update the `.env` file with your Firebase and MongoDB credentials

5. Start the development server
   ```
   npm run dev:all
   ```

### Firebase Setup

1. Create a new Firebase project
2. Enable Authentication (Email/Password)
3. Create Firestore Database
4. Add the Firebase config to your `.env` file

### MongoDB Setup

1. Create a MongoDB Atlas cluster
2. Create a database named `invoice-generator`
3. Add the MongoDB connection string to your `.env` file

## Deployment

For production deployment:

1. Build the frontend
   ```
   npm run build
   ```

2. Deploy the server and frontend to your hosting provider of choice

## Demo

[Video Demo](https://drive.google.com/file/your-demo-video-link)

## License

This project is licensed under the MIT License - see the LICENSE file for details.