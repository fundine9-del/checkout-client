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
}

export interface Receipt {
  order_id: string
  payment_method: string
  total: number
  paid_at: string
  items: ReceiptLine[]
}