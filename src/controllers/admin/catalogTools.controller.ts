import { Request, Response } from 'express';
import { colorSwatchService } from '../../services/colorSwatch.service';
import { sizePresetService } from '../../services/sizePreset.service';
import { productDraftService } from '../../services/productDraft.service';
import { inventoryService, InventoryStatus } from '../../services/inventory.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';

const str = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);

/** Colour library, size presets, product-form drafts and the inventory screen. */
export const catalogToolsController = {
  // ---------- Colour library ----------

  listSwatches: asyncHandler(async (req: Request, res: Response) => {
    const swatches = await colorSwatchService.list(req.query.includeInactive === 'true');
    res.json(ApiResponse.ok({ swatches }));
  }),

  createSwatch: asyncHandler(async (req: Request, res: Response) => {
    const swatch = await colorSwatchService.create(req.body);
    res.status(201).json(ApiResponse.created({ swatch }, 'Colour saved to library'));
  }),

  updateSwatch: asyncHandler(async (req: Request, res: Response) => {
    const swatch = await colorSwatchService.update(req.params.id, req.body);
    res.json(ApiResponse.ok({ swatch }, 'Colour updated'));
  }),

  deleteSwatch: asyncHandler(async (req: Request, res: Response) => {
    await colorSwatchService.remove(req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Colour removed from library'));
  }),

  // ---------- Size presets ----------

  listSizePresets: asyncHandler(async (req: Request, res: Response) => {
    const presets = await sizePresetService.list({
      subCategoryId: str(req.query.subCategoryId),
      includeInactive: req.query.includeInactive === 'true',
    });
    res.json(ApiResponse.ok({ presets }));
  }),

  createSizePreset: asyncHandler(async (req: Request, res: Response) => {
    const preset = await sizePresetService.create(req.body);
    res.status(201).json(ApiResponse.created({ preset }, 'Size preset created'));
  }),

  updateSizePreset: asyncHandler(async (req: Request, res: Response) => {
    const preset = await sizePresetService.update(req.params.id, req.body);
    res.json(ApiResponse.ok({ preset }, 'Size preset updated'));
  }),

  deleteSizePreset: asyncHandler(async (req: Request, res: Response) => {
    await sizePresetService.remove(req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Size preset deleted'));
  }),

  // ---------- Drafts (autosave) ----------

  listDrafts: asyncHandler(async (req: Request, res: Response) => {
    const drafts = await productDraftService.list(req.admin!.id);
    res.json(ApiResponse.ok({ drafts }));
  }),

  getDraft: asyncHandler(async (req: Request, res: Response) => {
    const draft = await productDraftService.get(req.admin!.id, req.params.id);
    res.json(ApiResponse.ok({ draft }));
  }),

  saveDraft: asyncHandler(async (req: Request, res: Response) => {
    const draft = await productDraftService.save(req.admin!.id, req.params.id, req.body);
    res.json(ApiResponse.ok({ draft }, 'Draft saved'));
  }),

  deleteDraft: asyncHandler(async (req: Request, res: Response) => {
    await productDraftService.remove(req.admin!.id, req.params.id);
    res.json(ApiResponse.ok({ deleted: true }, 'Draft deleted'));
  }),

  // ---------- Inventory ----------

  inventory: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip, take } = parsePagination(req.query);
    const rawStatus = str(req.query.status)?.toUpperCase();
    const status: InventoryStatus = rawStatus === 'LOW' || rawStatus === 'OUT' ? rawStatus : 'ALL';

    const [{ items, total }, summary] = await Promise.all([
      inventoryService.list(
        {
          status,
          search: str(req.query.search),
          sportId: str(req.query.sportId),
          subCategoryId: str(req.query.subCategoryId),
        },
        skip,
        take,
      ),
      inventoryService.summary(),
    ]);

    res.json(
      ApiResponse.ok(
        { variants: items, summary },
        'Success',
        buildPaginationMeta(total, { page, limit }),
      ),
    );
  }),
};
