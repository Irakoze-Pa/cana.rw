import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { createCustomerSalesOrder, createSalesOrder, listCustomerSalesOrders, listSalesOrders, transitionSalesOrder } from "./salesOrder.service";
const message = (error: unknown) => error instanceof Error ? error.message : "Unexpected sales order error.";
export async function create(req: AuthRequest, res: Response) { try { res.status(201).json({ data: await createSalesOrder(req.body) }); } catch (error) { res.status(400).json({ error: { code: "SALES_ORDER_INVALID", message: message(error) } }); } }
export async function list(_req: AuthRequest, res: Response) { try { res.json({ data: await listSalesOrders() }); } catch (error) { res.status(500).json({ error: { code: "SALES_ORDER_LIST_FAILED", message: message(error) } }); } }
export async function listMine(req: AuthRequest, res: Response) { try { res.json({ data: await listCustomerSalesOrders(req.user!.id) }); } catch (error) { res.status(500).json({ error: { code: "CUSTOMER_ORDER_LIST_FAILED", message: message(error) } }); } }
export async function createMine(req: AuthRequest, res: Response) { try { res.status(201).json({ data: await createCustomerSalesOrder(req.user!.id, req.body) }); } catch (error) { res.status(400).json({ error: { code: "CUSTOMER_ORDER_INVALID", message: message(error) } }); } }
export async function transition(req: AuthRequest, res: Response) { try { res.json({ data: await transitionSalesOrder(String(req.params.id), req.body.status, req.user?.id) }); } catch (error) { const text = message(error); res.status(/not found/i.test(text) ? 404 : 400).json({ error: { code: "SALES_ORDER_TRANSITION_INVALID", message: text } }); } }
