# UI/UX, Backend & Architecture Improvements

## Objective

Improve the application's architecture, user experience, and backend functionality. The goal is to separate responsibilities between pages, make workflows more intuitive, fix existing backend issues, and ensure the application is resilient to user mistakes.

---

# 1. Service Module

## Pending UI/UX

The **Service** module still needs a redesign.

### Requirements

- Improve the layout of the Service page.
- Make the category selection and creation more intuitive.
- Simplify the workflow for creating and editing services.
- The interface should follow the same design language used throughout the application.

---

# 2. Quote Module

## Pending UI/UX

The quote creation flow still needs improvements.

### Requirements

- Redesign the section where services are added to a quote.
- Improve the editing experience for quote items.
- Minimize unnecessary clicks.
- Provide immediate visual feedback whenever an item is added, edited, or removed.

---

# 3. Quote Module Architecture

Currently, quote creation and the quote list are displayed on the same page.

This should be separated.

## Required Changes

Create a dedicated page exclusively for creating and editing quotes.

The quote list page should only allow:

- View quotes
- Search quotes
- Filter quotes
- Delete quotes
- Open a quote for editing

The quote creation page should contain everything related to:

- Customer information
- Service selection
- Quote items
- Totals
- Notes
- PDF generation
- Quote editing

The workflow should feel focused and uninterrupted.

---

# 4. Service Module Architecture

Currently, service creation is mixed with the service listing.

## Required Changes

Move all service creation and editing into a dedicated page.

The service list page should only allow:

- Search
- Filter
- View services
- Delete services

The new page should manage:

- Create service
- Edit service
- Categories
- Dynamic attributes
- Pricing

This separation should improve usability and future scalability.

---

# 5. Finance Module

## Current Problem

The user cannot create financial records because no categories exist initially.

This creates a dead-end in the workflow.

## Required Behavior

The finance module must be flexible enough to support first-time users.

Examples of acceptable solutions:

- Allow creating a category directly from the transaction form.
- Display an empty state with a "Create Category" action.
- Automatically guide the user when no categories exist.

The application should never block the user because prerequisite data is missing.

---

# 6. QR Generator

## Backend Bug

The QR generation endpoint is failing.

Current error:

```text
POST http://localhost:5174/api/api/qr/codigos/generar/
404 (Not Found)
```

### Required Tasks

- Identify the root cause.
- Verify frontend routes.
- Verify backend routes.
- Verify API prefixes.
- Verify Django URL configuration.
- Verify proxy/Vite configuration.
- Verify DRF router configuration.

The QR generator must work correctly after the fix.

---

# 7. User Experience

The application must assume that users can make mistakes.

Every destructive or long process should provide recovery options.

## Required Features

- Cancel button while creating data.
- Cancel button while editing data.
- Confirmation dialogs before deleting.
- Validation messages that clearly explain errors.
- Graceful handling of invalid input.
- Prevent accidental data loss.

The user should never feel trapped inside a workflow.

---

# 8. General Requirements

- Maintain consistent UI across the application.
- Reuse existing components whenever possible.
- Avoid duplicated code.
- Keep components modular and reusable.
- Follow React and Django best practices.
- Do not break existing functionality.

---

# 9. Testing

When development is complete:

Perform complete end-to-end testing covering:

- Services
- Categories
- Quotes
- Finance
- QR Generator
- Navigation
- CRUD operations
- Error handling

Verify that all workflows are continuous and intuitive.

There should be no dead ends or broken navigation.

---

# Final Requirement

Before finishing:

- Stop the backend.
- Stop the frontend.
- Do not leave any development server running.
- Ensure there are no background processes left executing.