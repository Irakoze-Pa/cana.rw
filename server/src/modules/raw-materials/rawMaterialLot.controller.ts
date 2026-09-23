import { Request, Response } from "express";
import { createLot, getLotTrace, listLots, releaseLot } from "./rawMaterialLot.service";
const message = (error: unknown) => error instanceof Error ? error.message : "Unexpected lot error.";
export async function list(req: Request, res: Response) { try { res.json({ success: true, data: await listLots(req.params.id ? String(req.params.id) : undefined) }); } catch (error) { res.status(500).json({ success: false, message: message(error) }); } }
export async function create(req: Request, res: Response) { try { res.status(201).json({ success: true, data: await createLot(String(req.params.id), req.body) }); } catch (error) { res.status(400).json({ success: false, message: message(error) }); } }
export async function release(req: Request, res: Response) { try { res.json({ success: true, data: await releaseLot(String(req.params.id), String(req.params.lotId)) }); } catch (error) { res.status(400).json({ success: false, message: message(error) }); } }
export async function trace(req: Request, res: Response) { try { res.json({ success: true, data: await getLotTrace(String(req.params.lotId)) }); } catch (error) { res.status(400).json({ success: false, message: message(error) }); } }
