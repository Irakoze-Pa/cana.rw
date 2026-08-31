# CANA Platform Architecture

## Product model

CANA is a single platform with three role-aware experiences: a public site for CANA Group, CANA Paints, and CANA Services; a customer workspace for accounts and quotations; and an operations workspace for sales, procurement, inventory, production, and reporting.

Every operational record has an owner, a status, a history, and a clear next action.

## Roles

| Role | Scope |
| --- | --- |
| Customer | Their profile, quotations, and orders. |
| Sales | Products, customer enquiries, quotations, and order handoff. |
| Procurement | Suppliers, purchase orders, and goods receipts. |
| Warehouse | Inventory movements, counts, and stock adjustments. |
| Production | Formulas, production orders, batches, and consumption. |
| Quality | Batch inspection and release or rejection. |
| Administrator | Users, roles, configuration, and all operational records. |

## Operational logic

```text
Product catalogue -> customer enquiry / quotation -> approved quotation / sales order
  -> fulfil from finished goods
  -> or plan production -> approved formula -> production order -> reserve materials
     -> production batch -> material consumption -> quality release -> finished-goods receipt

Supplier -> purchase order -> approval -> goods receipt -> raw-material inventory increase
```

Inventory is a ledger, not a number edited in place. Receipts, issues, returns, adjustments, reservations, and releases create immutable transactions. On-hand, reserved, and available quantities are calculated from that history.

## State transitions

- Quotations: `draft -> submitted -> under_review -> approved | rejected | expired`
- Purchase orders: `draft -> pending_approval -> approved -> partially_received -> received | cancelled`
- Production orders: `draft -> planned -> released -> in_production -> completed | on_hold | cancelled`
- Production batches: `planned -> active -> awaiting_quality -> released | rejected`

The API rejects invalid transitions and records the actor and time for every accepted transition.

## Engineering rules

- Version endpoints under `/api/v1` and return consistent success and error envelopes.
- Validate at the route boundary; put business rules and transaction boundaries in services.
- Authenticate by default and authorize every mutation by role or permission.
- Client domains own their server state, form state, and presentational components.
- Every list has loading, empty, error, and permission-denied states; an action appears only when it is a valid next transition.

## Rebuild order

1. Shared API foundation: configuration, errors, validation, authentication, authorization, audit metadata.
2. Master data: users, customers, products, raw materials, suppliers, formulas.
3. Transactional workflows: quotation, purchase order, inventory ledger, production, quality.
4. Public, customer, and operations client shells with role-aware workflows.
5. Reporting, notifications, tests, and deployment hardening.
