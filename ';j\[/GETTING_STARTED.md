# First-run setup

## What the system creates automatically

- Purchase-order, sales-order, production-batch, and material-consumption numbers.
- Raw-material inventory records and receipt ledger entries when an approved purchase order is received.
- Finished-product stock when a production batch is completed.
- Finished-product stock deduction when a sales order is delivered.

## What your team enters

1. Suppliers.
2. Raw materials, including units, minimum stock, cost, and default supplier.
3. Finished products and selling prices.
4. Active formulas/recipes for each manufactured product.
5. Purchase orders, customer quotations, and sales orders.

## Local demo data

For a fresh local database only, add `SEED_DEMO_DATA=true` to `server/.env` and run:

```sh
npm run seed --prefix server
```

It creates an administrator, one supplier, one raw material, one product, and one active formula. The default demo login is printed in the terminal. Set `SEED_ADMIN_PASSWORD` before running the command to avoid the development default.

## Recommended daily workflow

1. Create/approve a purchase order and mark it received when goods arrive.
2. Create a production order from an active formula and record material consumption.
3. Complete the batch to release finished stock.
4. Create a sales order for the client, then deliver it only after stock is ready.
