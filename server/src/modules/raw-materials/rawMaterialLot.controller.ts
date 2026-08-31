import { Request, Response } from "express";
import { createLot, listLots } from "./rawMaterialLot.service";
const message = (error: unknown) => error instanceof Error ? error.message : "Unexpected lot error.";
export async function list(req: Request, res: Response) { try { res.json({ success: true, data: await listLots(String(req.params.id)) }); } catch (error) { res.status(500).json({ success: false, message: message(error) }); } }
export async function create(req: Request, res: Response) { try { res.status(201).json({ success: true, data: await createLot(String(req.params.id), req.body) }); } catch (error) { res.status(400).json({ success: false, message: message(error) }); } }
