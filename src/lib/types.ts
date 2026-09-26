export interface Order {
  id: string
  customer_name: string | null
  status: 'open' | 'paid' | 'cancelled'
  payment_method: 'cash' | 'card' | 'mobile' | null
  total: number
  store_id: string | null
  created_at: string
  paid_at: string | null
}

export interface OrderItem {
  id: string
  order_id: string
  item_id: string | null
  barcode: string | null
  name: string
  price: number
  quantity: number
  created_at: string
}

export interface OrderWithItems extends Order {
  items: OrderItem[]
}

export interface ReceiptLine {
  barcode: string | null
  name: string
  quantity: number
  unit_price: number
  line_total: number
  /** VAT rate percent snapshot at scan time (0 = zero-rated). */
  vat_rate: number
  /** Receipt tax code (A/B/C…) assigned by rate, highest first. */
  tax_code: string
}

export interface ReceiptVatRow {
  code: string
  rate: number
  vatable: number
  vat: number
}

export interface Receipt {
  store_name?: string | null
  vat_number?: string | null
  pin?: string | null
  till_number?: string | null
  customer_name?: string | null
  order_id: string
  payment_method: string
  total: number
  /** Amount tendered (cash), or null when not captured. */
  tendered?: number | null
  change?: number | null
  paid_at: string
  items: ReceiptLine[]
  vat_rows?: ReceiptVatRow[]
  item_count?: number
  /** Data URL of the checkout-receipt QR (scan at the till to reprint). */
  qr_data?: string
}

export interface Store {
  id: string
  name: string
}