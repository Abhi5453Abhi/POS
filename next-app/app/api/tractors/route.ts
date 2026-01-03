import { NextRequest } from 'next/server';
import { sql, formatDate } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';
import { Tractor } from '@/lib/types';

// GET /api/tractors - List tractors
export async function GET(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        let tractors;
        if (status === 'in_stock') {
            tractors = await sql`
        SELECT id, brand, model, year, type, chassis_number, engine_number,
               purchase_price, COALESCE(sale_price, 0) as sale_price, status, supplier_name,
               COALESCE(supplier_father_name, '') as supplier_father_name,
               COALESCE(supplier_address, '') as supplier_address,
               COALESCE(supplier_phone, '') as supplier_phone,
               purchase_date, COALESCE(sale_date::text, '') as sale_date, 
               COALESCE(customer_name, '') as customer_name,
               COALESCE(customer_father_name, '') as customer_father_name,
               COALESCE(customer_address, '') as customer_address,
               COALESCE(customer_phone, '') as customer_phone,
               COALESCE(notes, '') as notes, exchange_tractor_id
        FROM tractors WHERE status = 'in_stock' ORDER BY id DESC
      `;
        } else {
            tractors = await sql`
        SELECT id, brand, model, year, type, chassis_number, engine_number,
               purchase_price, COALESCE(sale_price, 0) as sale_price, status, supplier_name,
               COALESCE(supplier_father_name, '') as supplier_father_name,
               COALESCE(supplier_address, '') as supplier_address,
               COALESCE(supplier_phone, '') as supplier_phone,
               purchase_date, COALESCE(sale_date::text, '') as sale_date, 
               COALESCE(customer_name, '') as customer_name,
               COALESCE(customer_father_name, '') as customer_father_name,
               COALESCE(customer_address, '') as customer_address,
               COALESCE(customer_phone, '') as customer_phone,
               COALESCE(notes, '') as notes, exchange_tractor_id
        FROM tractors ORDER BY id DESC
      `;
        }

        // Fetch all transactions for tractors in one go to avoid N+1 and enable client-side edit without fetch
        const allTransactions = await sql`
            SELECT id, type, amount, category, date::text as date, description, entity_id
            FROM transactions 
            WHERE entity_type = 'tractor'
            ORDER BY date DESC
        `;

        // Create a map of tractor_id -> transactions
        const transactionsMap = new Map<number, any[]>();
        allTransactions.forEach(t => {
            const tractorId = parseInt(t.entity_id);
            if (!transactionsMap.has(tractorId)) {
                transactionsMap.set(tractorId, []);
            }
            // Format transaction for frontend
            transactionsMap.get(tractorId)?.push({
                id: t.id,
                type: Number(t.amount) >= 0 ? 'debit' : 'credit',
                recordType: t.type, // Preserve original DB type (purchase/sale)
                category: t.category || (t.description ? t.description.split(' - ')[0] : 'Other'),
                amount: Math.abs(Number(t.amount)),
                description: t.description
            });
        });

        // Enrich with exchange tractor details and transactions
        const enrichedTractors = await Promise.all(
            tractors.map(async (t) => {
                const tractor = t as Tractor;

                // Attach transactions
                (tractor as any).transactions = transactionsMap.get(Number(tractor.id)) || [];

                if (tractor.exchange_tractor_id) {
                    const exchangeTractors = await sql`
            SELECT id, brand, model, year, type, chassis_number, engine_number,
                   purchase_price, COALESCE(sale_price, 0) as sale_price, status, supplier_name, 
                   COALESCE(supplier_father_name, '') as supplier_father_name,
                   COALESCE(supplier_address, '') as supplier_address,
                   COALESCE(supplier_phone, '') as supplier_phone,
                   purchase_date, COALESCE(sale_date::text, '') as sale_date, 
                   COALESCE(customer_name, '') as customer_name, 
                   COALESCE(customer_father_name, '') as customer_father_name,
                   COALESCE(customer_address, '') as customer_address,
                   COALESCE(customer_phone, '') as customer_phone,
                   COALESCE(notes, '') as notes
            FROM tractors WHERE id = ${tractor.exchange_tractor_id}
          `;
                    if (exchangeTractors.length > 0) {
                        tractor.exchange_tractor = exchangeTractors[0] as Tractor;
                    }
                }
                return tractor;
            })
        );

        return jsonResponse(enrichedTractors);
    } catch (error) {
        console.error('List tractors error:', error);
        return errorResponse('internal server error', 500);
    }
}

// POST /api/tractors - Create tractor
export async function POST(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const body = await request.json();

        if (!body.brand || !body.model) {
            return errorResponse('brand and model are required', 400);
        }

        const purchaseDate = body.purchase_date || formatDate();

        const transactions = body.transactions || [];
        let calculatedPurchasePrice = body.purchase_price || 0;

        if (transactions.length > 0) {
            calculatedPurchasePrice = 0;
            // Also calculate potential initial sale_price/credit info if user wants
            let calculatedSaleCredit = 0;

            for (const t of transactions) {
                // User Requirement: 
                // 1. All DEBIT transactions -> Add to Purchase Price
                // 2. All CREDIT transactions -> Add to Sale Price

                if (t.type === 'debit') {
                    // Logic: Debits (Costs) increase the effective Purchase Price
                    calculatedPurchasePrice += t.amount;
                } else if (t.type === 'credit') {
                    // Logic: Credits are likely sales related or offsets
                    // User said: "when we are crediting anything, it should be considered as a sale info"
                    // However, we didn't have a variable for it yet in this scope.
                    // We can populate body.sale_price with this if not provided?
                    calculatedSaleCredit += t.amount;
                }
            }

            // Ensure non-negative
            calculatedPurchasePrice = Math.max(0, calculatedPurchasePrice);

            // If user's intent is to auto-populate sale_price from credits during ADD tractor:
            if (!body.sale_price && calculatedSaleCredit > 0) {
                // Only set if not explicitly provided
                body.sale_price = calculatedSaleCredit;
            }
        }

        // Insert tractor
        const result = await sql`
      INSERT INTO tractors (brand, model, year, type, chassis_number, engine_number, 
                           purchase_price, status, supplier_name, supplier_father_name, supplier_address, supplier_phone, purchase_date, notes)
      VALUES (${body.brand}, ${body.model}, ${body.year || 2024}, ${body.type || 'new'}, 
              ${body.chassis_number || ''}, ${body.engine_number || ''}, 
              ${calculatedPurchasePrice}, 'in_stock', ${body.supplier_name || ''}, 
              ${body.supplier_father_name || ''}, ${body.supplier_address || ''}, ${body.supplier_phone || ''},
              ${purchaseDate}, ${body.notes || ''})
      RETURNING id
    `;

        const tractorId = result[0].id;

        // Insert transactions
        if (transactions.length > 0) {
            for (const t of transactions) {
                // For purchase: Debit is cost (positive), Credit is discount (negative)
                // We store the transaction type as received from frontend for record keeping
                const amount = t.type === 'debit' ? t.amount : -t.amount;
                const description = t.category + (t.customCategory ? ` - ${t.customCategory}` : (t.description ? ` - ${t.description}` : ''));

                await sql`
                    INSERT INTO transactions (type, entity_type, entity_id, amount, party_name, date, description, category)
                    VALUES ('purchase', 'tractor', ${tractorId}, ${amount},
                            ${body.supplier_name || ''}, ${purchaseDate},
                            ${description}, ${t.category})
                `;
            }
        } else {
            // Legacy/Fallback: Record single purchase transaction if no detailed transactions provided
            await sql`
                INSERT INTO transactions (type, entity_type, entity_id, amount, party_name, date, description, category)
                VALUES ('purchase', 'tractor', ${tractorId}, ${calculatedPurchasePrice}, 
                        ${body.supplier_name || ''}, ${purchaseDate}, 
                        ${body.brand + ' ' + body.model + ' purchase'}, 'Purchase Price')
            `;
        }

        // Fetch the created tractor
        const tractors = await sql`
      SELECT id, brand, model, year, type, chassis_number, engine_number,
             purchase_price, COALESCE(sale_price, 0) as sale_price, status, supplier_name,
             COALESCE(supplier_father_name, '') as supplier_father_name,
             COALESCE(supplier_address, '') as supplier_address,
             COALESCE(supplier_phone, '') as supplier_phone,
             purchase_date, COALESCE(sale_date::text, '') as sale_date, 
             COALESCE(customer_name, '') as customer_name,
             COALESCE(customer_father_name, '') as customer_father_name,
             COALESCE(customer_address, '') as customer_address,
             COALESCE(customer_phone, '') as customer_phone,
             COALESCE(notes, '') as notes, exchange_tractor_id
      FROM tractors WHERE id = ${tractorId}
    `;

        return jsonResponse(tractors[0], 201);
    } catch (error) {
        console.error('Create tractor error:', error);
        return errorResponse('internal server error', 500);
    }
}
