import type { Item } from './schemas';

/** Alamat formulir opname untuk satu barang. */
export const stockCountHref = (item: Item) => `/goods?tab=counts&new=1&item=${item.id}`;

/** Alamat formulir kas keluar untuk membeli stok, terisi barang dan perkiraan 10 satuan. */
export const buyStockHref = (item: Item) =>
  `/cash?new=1&direction=keluar&fill.item_id=${item.id}&fill.unit_id=${String(item.data.unit_id || '')}&fill.title=${encodeURIComponent(`Beli stok: ${String(item.data.title)}`)}&fill.account=${encodeURIComponent('Pengadaan Barang & Persediaan')}&fill.amount=${Number(item.data.price || 0) * 10}`;
