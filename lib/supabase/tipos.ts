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
      cotizaciones: {
        Row: { codigo: string; comprador_id: string; creado_en: string; evento: Json | null; id: string; items: Json; pedido_id: string | null; total_centimos: number };
        Insert: { codigo?: string; comprador_id: string; creado_en?: string; evento?: Json | null; id?: string; items: Json; pedido_id?: string | null; total_centimos: number };
        Update: { codigo?: string; comprador_id?: string; creado_en?: string; evento?: Json | null; id?: string; items?: Json; pedido_id?: string | null; total_centimos?: number };
        Relationships: [
          { foreignKeyName: "cotizaciones_comprador_id_fkey"; columns: ["comprador_id"]; isOneToOne: false; referencedRelation: "perfiles"; referencedColumns: ["id"] },
          { foreignKeyName: "cotizaciones_pedido_id_fkey"; columns: ["pedido_id"]; isOneToOne: false; referencedRelation: "pedidos"; referencedColumns: ["id"] },
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
        Row: { cajas: number; cajas_reservadas: number; id: string; precio_caja_centimos: number; producto_id: string; subpedido_id: string; subtotal_centimos: number };
        Insert: { cajas: number; cajas_reservadas?: number; id?: string; precio_caja_centimos: number; producto_id: string; subpedido_id: string; subtotal_centimos: number };
        Update: { cajas?: number; cajas_reservadas?: number; id?: string; precio_caja_centimos?: number; producto_id?: string; subpedido_id?: string; subtotal_centimos?: number };
        Relationships: [
          { foreignKeyName: "items_producto_id_fkey"; columns: ["producto_id"]; isOneToOne: false; referencedRelation: "catalogo_publico"; referencedColumns: ["id"] },
          { foreignKeyName: "items_producto_id_fkey"; columns: ["producto_id"]; isOneToOne: false; referencedRelation: "productos"; referencedColumns: ["id"] },
          { foreignKeyName: "items_subpedido_id_fkey"; columns: ["subpedido_id"]; isOneToOne: false; referencedRelation: "subpedidos"; referencedColumns: ["id"] },
        ];
      };
      marcas: {
        Row: { activa: boolean; creado_en: string; descripcion: string | null; id: string; logo_url: string | null; nombre_comercial: string; pedido_minimo_cajas: number };
        Insert: { activa?: boolean; creado_en?: string; descripcion?: string | null; id?: string; logo_url?: string | null; nombre_comercial: string; pedido_minimo_cajas?: number };
        Update: { activa?: boolean; creado_en?: string; descripcion?: string | null; id?: string; logo_url?: string | null; nombre_comercial?: string; pedido_minimo_cajas?: number };
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
          recibe_nombre: string | null; recibe_telefono: string | null; tipo: string; pagado_centimos: number;
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
          codigo_postal: string | null; direccion: string | null; direccion_detalle: string | null;
          distrito: string | null; foto_ruta: string | null; referencia: string | null;
        };
        Insert: {
          creado_en?: string; empresa?: string | null; id: string; marca_id?: string | null; nombre?: string | null;
          rol?: string; ruc?: string | null; tipo_negocio?: string | null; whatsapp?: string | null;
          codigo_postal?: string | null; direccion?: string | null; direccion_detalle?: string | null;
          distrito?: string | null; foto_ruta?: string | null; referencia?: string | null;
        };
        Update: {
          creado_en?: string; empresa?: string | null; id?: string; marca_id?: string | null; nombre?: string | null;
          rol?: string; ruc?: string | null; tipo_negocio?: string | null; whatsapp?: string | null;
          codigo_postal?: string | null; direccion?: string | null; direccion_detalle?: string | null;
          distrito?: string | null; foto_ruta?: string | null; referencia?: string | null;
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
      parametros_cotizador: {
        Row: {
          id: boolean; no_toman_pct: number; factor_tranquilo: number; factor_normal: number; factor_fuerte: number; factor_dia: number;
          bienvenida_tragos_hora: number; fiesta_primera_hora: number; fiesta_tragos_hora: number; cena_copas_hora: number;
          brindis_copas: number; cena_receta_id: string | null; brindis_receta_id: string | null; hielo_kg_persona_hora: number;
          factor_calor: number; sin_alcohol_l_hora_toma: number; sin_alcohol_l_hora_no_toma: number; margen_pct: number;
        };
        Insert: { id?: boolean };
        Update: { id?: boolean };
        Relationships: [];
      };
      zonas_envio: {
        Row: { monto_centimos: number; nombre: string; zona: number };
        Insert: { monto_centimos: number; nombre: string; zona: number };
        Update: { monto_centimos?: number };
        Relationships: [];
      };
      distritos_envio: {
        Row: { distrito: string; zona: number };
        Insert: { distrito: string; zona: number };
        Update: { zona?: number };
        Relationships: [];
      };
      reclamos: {
        Row: {
          codigo: string; correo: string; creado_en: string; descripcion_bien: string; detalle: string; domicilio: string;
          fecha_limite: string; bien: string; id: string; monto_centimos: number | null; nombre: string; numero: number;
          numero_documento: string; pedido: string; pedido_codigo: string | null; perfil_id: string | null;
          respondido_en: string | null; respuesta: string | null; telefono: string | null; tipo: string; tipo_documento: string;
        };
        Insert: { codigo: string };
        Update: { respuesta?: string | null };
        Relationships: [];
      };
      avisos: {
        Row: { creado_en: string; enlace: string | null; id: string; leido_en: string | null; perfil_id: string; texto: string };
        Insert: { creado_en?: string; enlace?: string | null; id?: string; leido_en?: string | null; perfil_id: string; texto: string };
        Update: { leido_en?: string | null };
        Relationships: [];
      };
      ingredientes: {
        Row: { activo: boolean; categoria: string | null; id: string; nombre: string; orden: number; unidad: string };
        Insert: { activo?: boolean; categoria?: string | null; id?: string; nombre: string; orden?: number; unidad: string };
        Update: { activo?: boolean; categoria?: string | null; id?: string; nombre?: string; orden?: number; unidad?: string };
        Relationships: [];
      };
      receta_ingredientes: {
        Row: { cantidad: number; ingrediente_id: string; receta_id: string };
        Insert: { cantidad: number; ingrediente_id: string; receta_id: string };
        Update: { cantidad?: number; ingrediente_id?: string; receta_id?: string };
        Relationships: [
          { foreignKeyName: "receta_ingredientes_receta_id_fkey"; columns: ["receta_id"]; isOneToOne: false; referencedRelation: "recetas"; referencedColumns: ["id"] },
          { foreignKeyName: "receta_ingredientes_ingrediente_id_fkey"; columns: ["ingrediente_id"]; isOneToOne: false; referencedRelation: "ingredientes"; referencedColumns: ["id"] },
        ];
      };
      recetas: {
        Row: {
          activo: boolean; categoria: string; id: string; ml_por_trago: number; nombre: string; orden: number;
          mezclador: string | null; mezclador_ml: number; limones: number; jarabe_ml: number;
        };
        Insert: { activo?: boolean; categoria: string; id?: string; ml_por_trago: number; nombre: string; orden?: number };
        Update: { activo?: boolean; categoria?: string; id?: string; ml_por_trago?: number; nombre?: string; orden?: number };
        Relationships: [];
      };
      solicitudes_marca: {
        Row: {
          contacto_nombre: string | null; contacto_whatsapp: string | null; creado_en: string; direccion_recojo: string; estado: string;
          id: string; marca_id: string | null; motivo_rechazo: string | null; nombre_comercial: string; perfil_id: string;
          razon_social: string; revisado_en: string | null; ruc: string; pedido_minimo_cajas: number;
        };
        Insert: {
          contacto_nombre?: string | null; contacto_whatsapp?: string | null; creado_en?: string; direccion_recojo: string; estado?: string;
          id?: string; marca_id?: string | null; motivo_rechazo?: string | null; nombre_comercial: string; perfil_id: string;
          razon_social: string; revisado_en?: string | null; ruc: string;
        };
        Update: {
          contacto_nombre?: string | null; contacto_whatsapp?: string | null; creado_en?: string; direccion_recojo?: string; estado?: string;
          id?: string; marca_id?: string | null; motivo_rechazo?: string | null; nombre_comercial?: string; perfil_id?: string;
          razon_social?: string; revisado_en?: string | null; ruc?: string;
        };
        Relationships: [
          { foreignKeyName: "solicitudes_marca_perfil_id_fkey"; columns: ["perfil_id"]; isOneToOne: false; referencedRelation: "perfiles"; referencedColumns: ["id"] },
          { foreignKeyName: "solicitudes_marca_marca_id_fkey"; columns: ["marca_id"]; isOneToOne: false; referencedRelation: "marcas"; referencedColumns: ["id"] },
        ];
      };
      subpedidos: {
        Row: {
          codigo: string; comision_centimos: number; comision_pct_aplicada: number; creado_en: string; entregado_en: string | null;
          estado: string; exento_comision: boolean; fecha_recojo: string | null; id: string; listo_en: string | null; marca_id: string;
          motivo_rechazo: string | null; pedido_id: string; recogido_en: string | null; total_cajas: number; total_centimos: number;
          fecha_disponible: string | null;
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
      tipo_evento_recetas: {
        Row: { nivel: string; receta_id: string; tipo_evento_id: string };
        Insert: { nivel?: string; receta_id: string; tipo_evento_id: string };
        Update: { nivel?: string; receta_id?: string; tipo_evento_id?: string };
        Relationships: [
          { foreignKeyName: "tipo_evento_recetas_receta_id_fkey"; columns: ["receta_id"]; isOneToOne: false; referencedRelation: "recetas"; referencedColumns: ["id"] },
          { foreignKeyName: "tipo_evento_recetas_tipo_evento_id_fkey"; columns: ["tipo_evento_id"]; isOneToOne: false; referencedRelation: "tipos_evento"; referencedColumns: ["id"] },
        ];
      };
      tipos_evento: {
        Row: {
          activo: boolean; id: string; nombre: string; orden: number;
          horas: number; perfil: string; bienvenida: boolean; bienvenida_horas: number; bienvenida_receta_id: string | null;
          brindis: boolean; cena: boolean; cena_horas: number;
        };
        Insert: { activo?: boolean; id?: string; nombre: string; orden?: number };
        Update: { activo?: boolean; id?: string; nombre?: string; orden?: number };
        Relationships: [];
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
      marca_responder_encargo: {
        Args: { p_subpedido: string; p_acepta: boolean; p_fecha?: string; p_motivo?: string };
        Returns: undefined;
      };
      pagar_pedido: { Args: { p_pedido: string; p_metodo: string }; Returns: undefined };
      aprobar_solicitud: { Args: { p_solicitud: string; p_comision?: number }; Returns: string };
      marca_guardar_minimo: { Args: { p_minimo: number }; Returns: undefined };
      rechazar_solicitud: { Args: { p_solicitud: string; p_motivo: string }; Returns: undefined };
      admin_guardar_marca: {
        Args: {
          p_marca: string; p_nombre: string; p_pedido_minimo: number; p_activa: boolean; p_comision: number;
          p_razon_social: string; p_ruc: string; p_contacto_nombre: string; p_contacto_whatsapp: string;
          p_contacto_correo: string; p_direccion_recojo: string;
        };
        Returns: undefined;
      };
      admin_fijar_recojo: { Args: { p_subpedido: string; p_fecha: string }; Returns: undefined };
      admin_marcar_recogido: { Args: { p_subpedido: string }; Returns: undefined };
      admin_en_camino: { Args: { p_pedido: string }; Returns: undefined };
      admin_entregar: { Args: { p_pedido: string }; Returns: undefined };
      admin_cancelar_subpedido: { Args: { p_subpedido: string; p_motivo: string }; Returns: undefined };
      admin_cancelar_pedido: { Args: { p_pedido: string; p_motivo: string }; Returns: undefined };
      admin_marcar_pagado: { Args: { p_pedido: string; p_metodo: string }; Returns: undefined };
      agregar_reemplazo: { Args: { p_pedido: string; p_producto: string; p_cajas: number }; Returns: string };
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
      admin_guardar_parametros: {
        Args: { p: Json };
        Returns: undefined;
      };
      admin_guardar_tipo_evento: {
        Args: {
          p_id: string | null; p_nombre: string; p_activo: boolean; p_horas: number; p_perfil: string; p_bienvenida: boolean;
          p_bienvenida_horas: number; p_bienvenida_receta: string | null; p_brindis: boolean; p_cena: boolean; p_cena_horas: number; p_barra: Json;
        };
        Returns: string;
      };
      admin_guardar_trago: {
        Args: { p_id: string | null; p_nombre: string; p_activo: boolean; p_ingredientes: Json };
        Returns: string;
      };
      admin_guardar_ingrediente: {
        Args: { p_id: string | null; p_nombre: string; p_unidad: string; p_categoria: string | null; p_activo: boolean };
        Returns: string;
      };
      marca_guardar_descripcion: {
        Args: { p_descripcion: string | null };
        Returns: undefined;
      };
      marca_guardar_logo: {
        Args: { p_ruta: string };
        Returns: undefined;
      };
      registrar_reclamo: {
        Args: {
          p_tipo: string; p_nombre: string; p_tipo_documento: string; p_numero_documento: string; p_domicilio: string;
          p_telefono: string | null; p_correo: string; p_bien: string; p_pedido_codigo: string | null;
          p_monto_centimos: number | null; p_descripcion_bien: string; p_detalle: string; p_pedido: string;
        };
        Returns: Json;
      };
      admin_guardar_envio: {
        Args: { p_zona: number; p_monto_centimos: number };
        Returns: undefined;
      };
      admin_responder_reclamo: {
        Args: { p_reclamo: string; p_respuesta: string };
        Returns: undefined;
      };
      perfil_guardar_foto: {
        Args: { p_ruta: string | null };
        Returns: undefined;
      };
      registrar_evento: {
        Args: { p_tipo: string; p_producto?: string | null };
        Returns: undefined;
      };
      admin_insights: {
        Args: Record<string, never>;
        Returns: Json;
      };
      marca_insights: {
        Args: Record<string, never>;
        Returns: Json;
      };
      crear_cotizacion: {
        Args: { p_items?: Json; p_evento?: Json };
        Returns: { cotizacion_id: string; codigo: string }[];
      };
      crear_pedido: {
        Args: {
          p_fecha_entrega: string;
          p_direccion: string;
          p_distrito: string;
          p_recibe_nombre: string;
          p_recibe_telefono: string;
          p_metodo_pago?: string;
          p_direccion_detalle?: string;
          p_codigo_postal?: string;
          p_referencia?: string;
          p_nota?: string;
          p_evento_nombre?: string;
          p_evento_tipo?: string;
          p_evento_fecha?: string;
          p_invitados?: number;
          p_modo?: "separado" | "junto";
        };
        Returns: { pedido_id: string; codigo: string; tipo: string }[];
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
