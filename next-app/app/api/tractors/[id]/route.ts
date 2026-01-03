import { NextRequest } from 'next/server';
import { sql, formatDate } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';
import { Tractor } from '@/lib/types';

// GET /api/tractors/[id] - Get single tractor
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { id } = await params;
        const tractorId = parseInt(id);
        if (isNaN(tractorId)) {
            return errorResponse('invalid tractor id', 400);
        }

        const tractors = await sql`
      SELECT id, brand, model, year, type, chassis_number, engine_number,
             purchase_price, COALESCE(sale_price, 0) as sale_price, status, supplier_name, 
             purchase_date, COALESCE(sale_date::text, '') as sale_date, 
             COALESCE(customer_name, '') as customer_name, 
             COALESCE(notes, '') as notes, exchange_tractor_id
      FROM tractors WHERE id = ${tractorId}
    `;

        if (tractors.length === 0) {
            return errorResponse('tractor not found', 404);
        }

        const tractor = tractors[0] as Tractor;

        // Fetch transactions for this tractor
        const transactions = await sql`
            SELECT id, type, amount, category, date::text as date, description
            FROM transactions 
            WHERE entity_type = 'tractor' AND entity_id = ${tractorId}
            ORDER BY date DESC
        `;

        // Map backend transactions to frontend expected format if needed
        // Assuming frontend usage, we'll attach it to the tractor object.
        // We might need to extend the Tractor type definition in src/types.ts or cast it here.
        (tractor as any).transactions = transactions.map(t => {
            // Attempt to extract category from description if not stored explicitly or if needed
            // The current DB schema in previous steps showed 'category' being passed to description.
            // Let's check what 'category' column exists in transactions. 
            // In the POST handler we did: INSERT INTO transactions ... description. 
            // We didn't see a 'category' column in the INSERT statement previously!
            // Wait, looking at POST handler again:
            // INSERT INTO transactions (type, ..., description) VALUES (...)
            // There IS NO category column in the INSERTs I wrote earlier.
            // So we must rely on parsing the description or adding the category column.
            // For now, let's assume the frontend reconstructs it or we parse it.
            // Actually, in step 55 replacement, I saw:
            // const description = t.category + ...
            // So category is part of description strings.
            // To make "Edit" work nicely, we should ideally store category or parse it back.
            // As a quick fix to support the UI without schema migration right now (unless I add column),
            // I will try to parse category from description if possible, or just pass description.

            // However, to strictly follow the plan "Fixing UI Populate", 
            // providing the raw transactions list is a good start.
            return {
                id: t.id,
                type: Number(t.amount) >= 0 ? 'debit' : 'credit',
                recordType: t.type, // Preserve original DB type (purchase/sale)
                // Use category from DB if available, otherwise parse from description
                category: t.category || (t.description ? t.description.split(' - ')[0] : 'Other'),
                amount: Math.abs(Number(t.amount)),
                description: t.description
            };
        });

        // Enrich with exchange tractor details
        if (tractor.exchange_tractor_id) {
            const exchangeTractors = await sql`
        SELECT id, brand, model, year, type, chassis_number, engine_number,
               purchase_price, COALESCE(sale_price, 0) as sale_price, status, supplier_name, 
               purchase_date, COALESCE(sale_date::text, '') as sale_date, 
               COALESCE(customer_name, '') as customer_name, 
               COALESCE(notes, '') as notes
        FROM tractors WHERE id = ${tractor.exchange_tractor_id}
      `;
            if (exchangeTractors.length > 0) {
                tractor.exchange_tractor = exchangeTractors[0] as Tractor;
            }
        }

        return jsonResponse(tractor);
    } catch (error) {
        console.error('Get tractor error:', error);
        return errorResponse('internal server error', 500);
    }
}

// PUT /api/tractors/[id] - Update tractor
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { id } = await params;
        const tractorId = parseInt(id);
        if (isNaN(tractorId)) {
            return errorResponse('invalid tractor id', 400);
        }

        const body = await request.json();

        // 1. Fetch existing tractor to handle partial updates and get context for transactions
        const existingTractors = await sql`
            SELECT * FROM tractors WHERE id = ${tractorId}
        `;

        if (existingTractors.length === 0) {
            return errorResponse('tractor not found', 404);
        }

        const currentTractor = existingTractors[0];

        // 2. Prepare values for update, using new value or falling back to existing
        const brand = body.brand ?? currentTractor.brand;
        const model = body.model ?? currentTractor.model;
        const year = body.year ?? currentTractor.year;
        const type = body.type ?? currentTractor.type;
        const chassis_number = body.chassis_number ?? currentTractor.chassis_number;
        const engine_number = body.engine_number ?? currentTractor.engine_number;
        // 2b. Calculate purchase_price and sale_price if transactions are provided
        let calculatedPurchasePrice = body.purchase_price ?? currentTractor.purchase_price;
        let calculatedSalePrice = body.sale_price ?? currentTractor.sale_price;

        if (body.transactions && body.transactions.length > 0) {
            calculatedPurchasePrice = 0;
            let calculatedSaleCredit = 0;

            for (const t of body.transactions) {
                if (t.type === 'debit') {
                    calculatedPurchasePrice += t.amount;
                } else if (t.type === 'credit') {
                    calculatedSaleCredit += t.amount;
                }
            }
            // Logic: we replace purchase_price with sum of debits
            // And potentially update sale_price if credits exist
            // Note: If user is explicitly setting sale_price in body, it might override this, 
            // but usually transactions drive the values in this new logic.

            // If we are strictly following "Transactions drive the values":
            calculatedPurchasePrice = Math.max(0, calculatedPurchasePrice);

            // For sale price, if there are credits, we update it. 
            // Assuming credits = partial payments received or sale amount.
            if (calculatedSaleCredit > 0) {
                calculatedSalePrice = calculatedSaleCredit;
            }
        }

        const purchase_price = calculatedPurchasePrice;
        const sale_price = calculatedSalePrice;
        const status = body.status ?? currentTractor.status;
        const supplier_name = body.supplier_name ?? currentTractor.supplier_name;
        const purchase_date = body.purchase_date ?? currentTractor.purchase_date;
        const sale_date = body.sale_date ?? currentTractor.sale_date;
        const customer_name = body.customer_name ?? currentTractor.customer_name;
        const notes = body.notes ?? currentTractor.notes;
        const exchange_tractor_id = body.exchange_tractor_id ?? currentTractor.exchange_tractor_id;

        // 3. Update tractor
        await sql`
      UPDATE tractors SET 
        brand = ${brand},
        model = ${model},
        year = ${year},
        type = ${type},
        chassis_number = ${chassis_number},
        engine_number = ${engine_number},
        purchase_price = ${purchase_price},
        sale_price = ${sale_price},
        status = ${status},
        supplier_name = ${supplier_name},
        purchase_date = ${purchase_date},
        sale_date = ${sale_date},
        customer_name = ${customer_name},
        notes = ${notes},
        exchange_tractor_id = ${exchange_tractor_id}
      WHERE id = ${tractorId}
    `;

        // 4. Handle Transactions (Sync)
        if (body.transactions) {
            // Delete ALL existing transactions for this tractor to perform a full sync
            await sql`
                DELETE FROM transactions 
                WHERE entity_type = 'tractor' 
                AND entity_id = ${tractorId}
            `;

            const transactions = body.transactions;
            // Use purchase_date from resolved values, or fallback to today if somehow missing
            const txDate = purchase_date || formatDate();
            const partyName = supplier_name || '';

            if (transactions.length > 0) {
                for (const t of transactions) {
                    const amount = t.type === 'debit' ? t.amount : -t.amount;
                    const description = t.category + (t.customCategory ? ` - ${t.customCategory} ` : (t.description ? ` - ${t.description} ` : ''));

                    // Explicitly save the category to ensure robust retrieval
                    // Use recordType if available (preserves sale vs purchase), default to 'purchase'
                    const dbType = t.recordType || 'purchase';

                    await sql`
                        INSERT INTO transactions(type, entity_type, entity_id, amount, party_name, date, description, category)
            VALUES(${dbType}, 'tractor', ${tractorId}, ${amount},
                ${partyName}, ${txDate},
                ${description}, ${t.category})
                `;
                }
            } else if (purchase_price > 0) {
                // Fallback: if no detailed transactions but purchase price exists
                await sql`
                    INSERT INTO transactions(type, entity_type, entity_id, amount, party_name, date, description, category)
            VALUES('purchase', 'tractor', ${tractorId}, ${purchase_price},
                ${partyName}, ${txDate},
                ${brand + ' ' + model + ' purchase'}, 'Purchase Price')
        `;
            }
        }

        // 5. Fetch updated tractor to return
        const tractors = await sql`
      SELECT id, brand, model, year, type, chassis_number, engine_number,
            purchase_price, COALESCE(sale_price, 0) as sale_price, status, supplier_name,
            purchase_date, COALESCE(sale_date:: text, '') as sale_date,
            COALESCE(customer_name, '') as customer_name,
            COALESCE(notes, '') as notes, exchange_tractor_id
      FROM tractors WHERE id = ${tractorId}
        `;

        if (tractors.length === 0) {
            return errorResponse('tractor not found', 404);
        }

        const tractor = tractors[0] as Tractor;

        // Enrich with exchange tractor details
        if (tractor.exchange_tractor_id) {
            const exchangeTractors = await sql`
        SELECT id, brand, model, year, type, chassis_number, engine_number,
            purchase_price, COALESCE(sale_price, 0) as sale_price, status
        FROM tractors WHERE id = ${tractor.exchange_tractor_id}
        `;
            if (exchangeTractors.length > 0) {
                tractor.exchange_tractor = exchangeTractors[0] as Tractor;
            }
        }

        return jsonResponse(tractor);
    } catch (error) {
        console.error('Update tractor error:', error);
        return errorResponse('internal server error', 500);
    }
}

// DELETE /api/tractors/[id] - Delete tractor
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { id } = await params;
        const tractorId = parseInt(id);
        if (isNaN(tractorId)) {
            return errorResponse('invalid tractor id', 400);
        }

        // Remove references from other tractors
        await sql`UPDATE tractors SET exchange_tractor_id = NULL WHERE exchange_tractor_id = ${tractorId} `;

        // Remove references from service_records
        await sql`UPDATE service_records SET tractor_id = NULL WHERE tractor_id = ${tractorId} `;

        // Delete the tractor
        await sql`DELETE FROM tractors WHERE id = ${tractorId} `;

        return jsonResponse({ message: 'tractor deleted' });
    } catch (error) {
        console.error('Delete tractor error:', error);
        return errorResponse('internal server error', 500);
    }
}
