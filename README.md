# Mazen Warehouse Management System

A robust, modern Progressive Web Application (PWA) built for warehouse and retail inventory management. Designed specifically for **Awlad Ragab** (أولاد رجب), this system handles product inventory, customer credit tracking, invoicing, and direct Bluetooth thermal printing.

## 🌟 Key Features

*   **📦 Inventory Management**: Track products by units and boxes, with automatic stock deduction and alerts for low inventory.
*   **👥 Customer & Credit Tracking**: Manage customer profiles, track outstanding balances, and enforce credit limits seamlessly.
*   **🧾 Advanced Invoicing**: Create cash or credit invoices with real-time stock validation to prevent overselling.
*   **🖨️ Thermal Printing**: Direct-to-device printing via Web Bluetooth (BLE) for ESC/POS thermal printers (e.g., Xprinter 80mm), plus RawBT and HTML fallback support.
*   **🔄 Returns & Refunds**: Process partial or full invoice refunds with automatic stock replenishment and balance adjustments.
*   **💳 Payment Collection**: Collect partial or full payments on outstanding credit invoices.
*   **📊 Dashboard Analytics**: View real-time KPIs including total sales, pending balances, and low-stock items.
*   **📱 PWA Ready**: Installable on iOS, Android, and Desktop with responsive, offline-tolerant UI.

---

## 🛠️ Tech Stack

### Frontend
*   **Framework**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
*   **Styling**: [Tailwind CSS 3](https://tailwindcss.com/)
*   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
*   **Routing**: [React Router v6](https://reactrouter.com/)
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **Notifications**: [React Hot Toast](https://react-hot-toast.com/)
*   **HTTP Client**: [Axios](https://axios-http.com/)

---

## 📁 Project Architecture

The `src/` directory is structured logically to separate concerns:

```
src/
├── api.js                # Centralized Axios HTTP client & API route definitions
├── store.js              # Global Zustand state (auth, cache, theme)
├── main.jsx              # React application entry point
├── App.jsx               # Router configuration and layout guards
├── index.css             # Global Tailwind and custom CSS styles
│
├── pages/                # Main application views (Routes)
│   ├── Login.jsx             # Authentication
│   ├── Dashboard.jsx         # KPI analytics
│   ├── Products.jsx          # Inventory CRUD
│   ├── Customers.jsx         # Customer CRUD
│   ├── CustomerDetails.jsx   # Specific customer ledger & history
│   ├── Invoices.jsx          # Invoice creation, printing, and returns
│   └── Settings.jsx          # App settings (Theme, Cache, Diagnostics)
│
├── components/           # Reusable UI building blocks
│   ├── UI.jsx                    # Forms, Modals, Tables, Spinners
│   ├── Sidebar.jsx               # Main navigation
│   └── InvoicePrintTemplate.jsx  # Fallback HTML template for A4 printing
│
└── utils/                # Helper functions and business logic
    ├── format.js             # Date, Number, and Currency formatting (EGP)
    ├── messages.js           # API English → Arabic error translation dictionary
    ├── print.js              # Hidden iframe HTML printing engine
    ├── thermalBluetooth.js   # Web Bluetooth (BLE) ESC/POS bitmap generation
    └── printHelper.js        # Fallback router for print methods
```

---

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18+)
*   npm or yarn
*   A running backend API instance (configured in `api.js` via `VITE_API_BASE_URL`).

### Installation

1.  **Clone the repository** (if applicable) or navigate to the project directory:
    ```bash
    cd mazenSystem
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

4.  **Build for production**:
    ```bash
    npm run build
    ```
    This will generate an optimized `dist/` folder ready for deployment.

---

## 🖨️ Printing Configuration

The system uses a tiered fallback approach for printing invoices:

1.  **Web Bluetooth (BLE)**: If using Chrome/Edge on Android or Desktop, the app connects directly to a paired thermal printer (e.g., Xprinter) and sends a monochrome bitmap generated via HTML Canvas.
2.  **RawBT**: If installed on Android, the app provides a button to share the invoice text layout directly to the RawBT print service.
3.  **HTML Print (Fallback)**: If BLE is unavailable, the app falls back to a standard browser print dialog via a hidden iframe, generating an 80mm-width HTML receipt or A4 document.

> **Note**: For Web Bluetooth to work on Android, Location services must be enabled, and the site must be served over HTTPS.

---

## 🔒 Security & State

*   **Authentication**: Uses JWT tokens. The token is persisted in `localStorage` and attached to all Axios requests via an interceptor.
*   **Caching**: To optimize performance, `Zustand` caches API responses for products and customers. When a mutation occurs (Create, Update, Delete), the cache is invalidated via `useStore.getState().clearCache()`, forcing a fresh fetch on the next page load.

---

## 👨‍💻 Development Notes (Clean Code)

*   **Components**: UI components are highly modularized in `UI.jsx` (e.g., `Modal`, `SearchableSelect`). Use these to maintain design consistency.
*   **Styling**: Avoid using arbitrary inline styles. Stick to Tailwind classes and the centralized constants exported from `UI.jsx` (`inputCls`, `labelCls`, `badgeCls`).
*   **Translations**: All backend errors are in English. Update `src/utils/messages.js` if the backend adds new error responses to ensure the user sees Arabic feedback.
*   **Double-Submit Prevention**: Ensure all action buttons (Save, Delete, Print) implement loading states (`disabled={loading}`) to prevent rapid clicking from users.
