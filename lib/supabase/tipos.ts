// Tipos de la base de datos, generados desde Supabase (no editar a mano).
// Le dicen a TypeScript qué columnas tiene cada tabla. Regenerar cuando cambien las tablas.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      carrito: {
        Row: { agregado_en: string; cajas: number; comprador_id: string; producto_id: string };
        Insert: { agregado_en?: string; cajas: number; comprador_id: string; producto_id: string };
        Update: { agregado_en?: string; cajas?: number; comprador_id?: string; producto_id?: string };
        Relationships: [
          { foreignKeyName: "carrito_comprador_id_fkey"; columns: ["comprador_id"]; isOneToOne: false; referencedRelation: "perfiles"; referencedColumns: ["id"] },
          { foreignKeyName: "carrito_producto_id_fkey"; columns: ["producto_id"]; isOneToOne: false; referencedRelation: "productos"; referencedColumns: ["id"] },
        ];
      };
      escalas_precio: {
        Row: { desde_cajas: number; hasta_cajas: number | null; id: string; precio_caja_centimos: number; producto_id: string };
        Insert: { desde_cajas: number; hasta_cajas?: number | null; id?: string; precio_caja_centimos: number; producto_id: string };
        Update: { desde_cajas?: number; hasta_cajas?: number | null; id?: string; precio_caja_centimos?: number; producto_id?: string };
        Relationships: [
          { foreignKeyName: "escalas_precio_producto_id_fkey"; columns: ["producto_id"]; isOneToOne: false; referencedRelation: "catalogo_publico"; referencedColumns: ["id"] },
          { foreignKeyName: "escalas_precio_producto_id_fkey"; columns: ["producto_id"]; isOneToOne: false; referencedRelation: "productos"; referencedColumns: ["id"] },
        ];
      };
      favoritos: {
        Row: { comprador_id: string; creado_en: string; producto_id: string };
        Insert: { comprador_id: string; creado_en?: string; producto_id: string };
        Update: { comprador_id?: string; creado_en?: string; producto_id?: string };
        Relationships: [
          { foreignKeyName: "favoritos_comprador_id_fkey"; columns: ["comprador_id"]; isOneToOne: false; referencedRelation: "perfiles"; referencedColumns: ["id"] },
          { foreignKeyName: "favoritos_producto_id_fkey"; columns: ["producto_id"]; isOneToOne: false; referencedRelation: "catalogo_publico"; referencedColumns: ["id"] },
          { foreignKeyName: "favoritos_producto_id_fkey"; columns: ["producto_id"]; isOneToOne: false; referencedRelation: "productos"; referencedColumns: ["id"] },
        ];
      };
      items: {
        Row: { cajas: number; id: string; precio_caja_centimos: number; producto_id: string; subpedido_id: string; subtotal_centimos: number };
        Insert: { cajas: number; id?: string; precio_caja_centimos: number; producto_id: string; subpedido_id: string; subtotal_centimos: number };
        Update: { cajas?: number; id?: string; precio_caja_centimos?: number; producto_id?: string; subpedido_id?: string; subtotal_centimos?: number };
        Relationships: [
          { foreignKeyName: "items_producto_id_fkey"; columns: ["producto_id"]; isOneToOne: false; referencedRelation: "catalogo_publico"; referencedColumns: ["id"] },
          { foreignKeyName: "items_producto_id_fkey"; columns: ["producto_id"]; isOneToOne: false; referencedRelation: "productos"; referencedColumns: ["id"] },
          { foreignKeyName: "items_subpedido_id_fkey"; columns: ["subpedido_id"]; isOneToOne: false; referencedRelation: "subpedidos"; referencedColumns: ["id"] },
        ];
      };
      marcas: {
        Row: { activa: boolean; creado_en: string; id: string; nombre_comercial: string; pedido_minimo_cajas: number };
        Insert: { activa?: boolean; creado_en?: string; id?: string; nombre_comercial: string; pedido_minimo_cajas?: number };
        Update: { activa?: boolean; creado_en?: string; id?: string; nombre_comercial?: string; pedido_minimo_cajas?: number };
        Relationships: [];
      };
      marcas_privado: {
        Row: {
          comision_pct: number; contacto_correo: string | null; contacto_nombre: string | null; contacto_whatsapp: string | null;
          direccion_recojo: string | null; marca_id: string; razon_social: string; ruc: string;
        };
        Insert: {
          comision_pct: number; contacto_correo?: string | null; contacto_nombre?: string | null; contacto_whatsapp?: string | null;
          direccion_recojo?: string | null; marca_id: string; razon_social: string; ruc: string;
        };
        Update: {
          comision_pct?: number; contacto_correo?: string | null; contacto_nombre?: string | null; contacto_whatsapp?: string | null;
          direccion_recojo?: string | null; marca_id?: string; razon_social?: string; ruc?: string;
        };
        Relationships: [
          { foreignKeyName: "marcas_privado_marca_id_fkey"; columns: ["marca_id"]; isOneToOne: true; referencedRelation: "marcas"; referencedColumns: ["id"] },
        ];
      };
      pedidos: {
        Row: {
          codigo: string; comprador_id: string; creado_en: string; direccion_entrega: string; entregado_en: string | null;
          direccion_detalle: string | null; distrito: string | null; codigo_postal: string | null; referencia: string | null;
          recibe_nombre: string | null; recibe_telefono: string | null;
          envio_centimos: number; estado: string; evento_fecha: string | null; evento_nombre: string | null; evento_tipo: string | null;
          fecha_entrega_deseada: string; id: string; invitados: number | null; nota: string | null; pagado_en: string | null;
          pago_estado: string; pago_metodo: string | null; subtotal_centimos: number; total_centimos: number;
        };
        Insert: {
          codigo?: string; comprador_id: string; creado_en?: string; direccion_entrega: string; entregado_en?: string | null;
          direccion_detalle?: string | null; distrito?: string | null; codigo_postal?: string | null; referencia?: string | null;
          recibe_nombre?: string | null; recibe_telefono?: string | null;
          envio_centimos?: number; estado?: string; evento_fecha?: string | null; evento_nombre?: string | null; evento_tipo?: string | null;
          fecha_entrega_deseada: string; id?: string; invitados?: number | null; nota?: string | null; pagado_en?: string | null;
          pago_estado?: string; pago_metodo?: string | null; subtotal_centimos?: number; total_centimos?: number;
        };
        Update: {
          codigo?: string; comprador_id?: string; creado_en?: string; direccion_entrega?: string; entregado_en?: string | null;
          direccion_detalle?: string | null; distrito?: string | null; codigo_postal?: string | null; referencia?: string | null;
          recibe_nombre?: string | null; recibe_telefono?: string | null;
          envio_centimos?: number; estado?: string; evento_fecha?: string | null; evento_nombre?: string | null; evento_tipo?: string | null;
          fecha_entrega_deseada?: string; id?: string; invitados?: number | null; nota?: string | null; pagado_en?: string | null;
          pago_estado?: string; pago_metodo?: string | null; subtotal_centimos?: number; total_centimos?: number;
        };
        Relationships: [
          { foreignKeyName: "pedidos_comprador_id_fkey"; columns: ["comprador_id"]; isOneToOne: false; referencedRelation: "perfiles"; referencedColumns: ["id"] },
        ];
      };
      perfiles: {
        Row: {
          creado_en: string; empresa: string | null; id: string; marca_id: string | null; nombre: string | null;
          rol: string; ruc: string | null; tipo_negocio: string | null; whatsapp: string | null;
        };
        Insert: {
          creado_en?: string; empresa?: string | null; id: string; marca_id?: string | null; nombre?: string | null;
          rol?: string; ruc?: string | null; tipo_negocio?: string | null; whatsapp?: string | null;
        };
        Update: {
          creado_en?: string; empresa?: string | null; id?: string; marca_id?: string | null; nombre?: string | null;
          rol?: string; ruc?: string | null; tipo_negocio?: string | null; whatsapp?: string | null;
        };
        Relationships: [
          { foreignKeyName: "perfiles_marca_id_fkey"; columns: ["marca_id"]; isOneToOne: false; referencedRelation: "marcas"; referencedColumns: ["id"] },
        ];
      };
      productos: {
        Row: {
          activo: boolean; categoria: string; creado_en: string; foto_url: string | null; grado: number; id: string; marca_id: string;
          ml: number; nombre: string; registro_sanitario: string | null; stock_cajas: number; unidades_por_caja: number;
        };
        Insert: {
          activo?: boolean; categoria: string; creado_en?: string; foto_url?: string | null; grado: number; id?: string; marca_id: string;
          ml: number; nombre: string; registro_sanitario?: string | null; stock_cajas?: number; unidades_por_caja: number;
        };
        Update: {
          activo?: boolean; categoria?: string; creado_en?: string; foto_url?: string | null; grado?: number; id?: string; marca_id?: string;
          ml?: number; nombre?: string; registro_sanitario?: string | null; stock_cajas?: number; unidades_por_caja?: number;
        };
        Relationships: [
          { foreignKeyName: "productos_marca_id_fkey"; columns: ["marca_id"]; isOneToOne: false; referencedRelation: "marcas"; referencedColumns: ["id"] },
        ];
      };
      subpedidos: {
        Row: {
          codigo: string; comision_centimos: number; comision_pct_aplicada: number; creado_en: string; entregado_en: string | null;
          estado: string; exento_comision: boolean; fecha_recojo: string | null; id: string; listo_en: string | null; marca_id: string;
          motivo_rechazo: string | null; pedido_id: string; recogido_en: string | null; total_cajas: number; total_centimos: number;
        };
        Insert: {
          codigo: string; comision_centimos?: number; comision_pct_aplicada: number; creado_en?: string; entregado_en?: string | null;
          estado?: string; exento_comision?: boolean; fecha_recojo?: string | null; id?: string; listo_en?: string | null; marca_id: string;
          motivo_rechazo?: string | null; pedido_id: string; recogido_en?: string | null; total_cajas?: number; total_centimos?: number;
        };
        Update: {
          codigo?: string; comision_centimos?: number; comision_pct_aplicada?: number; creado_en?: string; entregado_en?: string | null;
          estado?: string; exento_comision?: boolean; fecha_recojo?: string | null; id?: string; listo_en?: string | null; marca_id?: string;
          motivo_rechazo?: string | null; pedido_id?: string; recogido_en?: string | null; total_cajas?: number; total_centimos?: number;
        };
        Relationships: [
          { foreignKeyName: "subpedidos_marca_id_fkey"; columns: ["marca_id"]; isOneToOne: false; referencedRelation: "marcas"; referencedColumns: ["id"] },
          { foreignKeyName: "subpedidos_pedido_id_fkey"; columns: ["pedido_id"]; isOneToOne: false; referencedRelation: "pedidos"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: {
      carrito_detalle: {
        Row: {
          activo: boolean | null; cajas: number | null; categoria: string | null; comprador_id: string | null; marca: string | null;
          marca_activa: boolean | null; marca_id: string | null; ml: number | null; nombre: string | null; pedido_minimo_cajas: number | null;
          precio_caja_centimos: number | null; producto_id: string | null; stock_cajas: number | null; subtotal_centimos: number | null;
          unidades_por_caja: number | null;
        };
        Relationships: [];
      };
      catalogo_publico: {
        Row: {
          categoria: string | null; foto_url: string | null; grado: number | null; id: string | null; marca: string | null;
          marca_id: string | null; ml: number | null; nombre: string | null; precio_caja_centimos: number | null; unidades_por_caja: number | null;
        };
        Relationships: [
          { foreignKeyName: "productos_marca_id_fkey"; columns: ["marca_id"]; isOneToOne: false; referencedRelation: "marcas"; referencedColumns: ["id"] },
        ];
      };
    };
    Functions: {
      marcar_listo: { Args: { p_subpedido: string }; Returns: undefined };
      rechazar_subpedido: { Args: { p_subpedido: string; p_motivo: string }; Returns: undefined };
      guardar_producto: {
        Args: {
          p_id: string | null;
          p_nombre: string;
          p_categoria: string;
          p_ml: number;
          p_grado: number;
          p_unidades: number;
          p_registro: string | null;
          p_stock: number;
          p_activo: boolean;
          p_tramos: Json;
          p_marca_id?: string;
        };
        Returns: string;
      };
      crear_pedido: {
        Args: {
          p_fecha_entrega: string;
          p_direccion: string;
          p_distrito: string;
          p_recibe_nombre: string;
          p_recibe_telefono: string;
          p_direccion_detalle?: string;
          p_codigo_postal?: string;
          p_referencia?: string;
          p_nota?: string;
          p_evento_nombre?: string;
          p_evento_tipo?: string;
          p_evento_fecha?: string;
          p_invitados?: number;
        };
        Returns: { pedido_id: string; codigo: string }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type Esquema = Database["public"];

// Fila de una tabla o vista: Tables<"productos">
export type Tables<T extends keyof (Esquema["Tables"] & Esquema["Views"])> = (Esquema["Tables"] & Esquema["Views"])[T] extends {
  Row: infer R;
}
  ? R
  : never;
