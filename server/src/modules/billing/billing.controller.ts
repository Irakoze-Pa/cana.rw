import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { createInvoice, listInvoices, listPayments, recordPayment } from "./billing.service";
const message = (error: unknown) => error instanceof Error ? error.message : "Unexpected billing error.";
export async function invoices(_req: AuthRequest, res: Response) { try { res.json({ data: await listInvoices() }); } catch (error) { res.status(500).json({ error: { message: message(error) } }); } }
export async function create(req: AuthRequest, res: Response) { try { res.status(201).json({ data: await createInvoice(req.body.salesOrder, req.body.dueDate, req.body.notes) }); } catch (error) { res.status(400).json({ error: { message: message(error) } }); } }
export async function payments(_req: AuthRequest, res: Response) { try { res.json({ data: await listPayments() }); } catch (error) { res.status(500).json({ error: { message: message(error) } }); } }
export async function receive(req: AuthRequest, res: Response) { try { res.status(201).json({ data: await recordPayment(req.body, req.user?.id) }); } catch (error) { res.status(400).json({ error: { message: message(error) } }); } }
