# UI/UX Improvements

## Navigation

### Organization
- Reorganize the navigation menu by grouping related sections together.
- The navigation should be more intuitive and reduce visual clutter.
- Similar features must be placed within the same category.

---

## Quote Actions (Cotizaciones.jsx)

### Share Button

Currently, **WhatsApp** and **Email** are displayed as separate buttons.

**Required behavior:**
- Replace them with a single **Share** button.
- When the user clicks the button, display a dropdown or popover with the available sharing options:
  - WhatsApp
  - Email
- Keep the UI clean and scalable so more sharing options can be added in the future.

---

## Quote Creation Workflow

### Current Problem

The workflow feels disconnected.

Currently:
1. A quote is created.
2. After the quote is created, items are added.

This creates the perception of two separate processes.

### Expected Behavior

The quote creation should feel like a **single continuous workflow**.

- When the user adds a service or item, the quote should update immediately.
- The interface should provide instant visual feedback.
- Avoid transitions that make the user feel they have completed one process and started another.
- The user experience should be smooth and continuous.

---

# Testing

After implementing all changes:

- Perform a complete end-to-end workflow test.
- Verify that every step of the quote process is continuous and intuitive.
- Ensure there are no broken flows or unnecessary page transitions.
- Confirm all buttons and actions behave correctly.

## Important

When testing is complete:

- Do **not** leave the backend running.
- Do **not** leave the frontend running.
- Stop all development servers before finishing.