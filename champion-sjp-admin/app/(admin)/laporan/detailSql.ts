// Query "Detail Catatan Kunjungan" — dipakai halaman Dashboard SJP (LIMIT 500)
// dan route export Excel (tanpa limit). Param: $1 first, $2 last, $3 femp, $4 lov|null.
export const DETAIL_SELECT = `
      SELECT v.visit_id, v.tgl::text tgl, to_char(v.checkin_dt,'HH24:MI') jam, e.emp_name,
       COALESCE(c.cust_name, p.nama_usaha, v.cust_code, v.prospek_id) outlet,
       (SELECT string_agg(lv.teks, ', ' ORDER BY lv.kode) FROM sjp_lov lv
          WHERE lv.lov_id = ANY(COALESCE(v.catatan_lov_ids, ARRAY[v.catatan_lov_id])) AND lv.tipe='CATATAN') catatan,
       v.free_text, CASE WHEN v.ar_collect IS NOT NULL THEN v.ar_amount END ar,
       count(*) OVER () total
      FROM sjp_visit_log v
       JOIN sjp_employee e ON e.emp_id = v.emp_id AND e.is_salesman
       LEFT JOIN sjp_customer c ON c.cust_code = v.cust_code
       LEFT JOIN sjp_prospect p ON p.prospek_id = v.prospek_id
      WHERE v.tgl BETWEEN $1 AND $2 AND ($3='' OR v.emp_id=$3)
        AND ($4::int IS NULL OR $4 = ANY(COALESCE(v.catatan_lov_ids, ARRAY[v.catatan_lov_id])))
      ORDER BY v.checkin_dt DESC`;
