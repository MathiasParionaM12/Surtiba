import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal, Seccion } from "@/components/PaginaLegal";
import { DIAS_HABILES_RESPUESTA, EMPRESA, SIN_DATO } from "@/lib/empresa";

export const metadata: Metadata = {
  title: "Condiciones de compra · Surtiba",
  description: "Precios, pago, entrega, encargos, cancelaciones y devoluciones al comprar en Surtiba.",
};

const enlace = "font-medium enlace text-verde hover:text-tinta";

// Reglas de compra tal como funcionan en la app (docs/producto.md). Si una regla cambia allá, cambia aquí.
export default function PaginaCondiciones() {
  return (
    <PaginaLegal
      etiqueta="Legal"
      titulo="Condiciones de compra y devoluciones"
      intro={
        <>
          Surtiba es un <strong className="font-medium text-tinta">prototipo del curso</strong>: los productos, las marcas y los
          pedidos son de prueba, no se cobra dinero real y no se entrega nada. Estas condiciones muestran cómo funcionaría la
          compra.
        </>
      }
    >
      <Seccion titulo="Quién te vende">
        <p>
          Le compras a <strong className="font-medium">{EMPRESA.nombre}</strong>, no a cada marca. Surtiba recoge los productos en
          cada marca y te entrega el pedido completo. Las marcas y tú no se comunican: cualquier duda la ve Surtiba.
        </p>
        <ul>
          <li>Razón social: {EMPRESA.razonSocial ?? SIN_DATO}</li>
          <li>RUC: {EMPRESA.ruc ?? SIN_DATO}</li>
          <li>Dirección: {EMPRESA.direccion ?? SIN_DATO}</li>
        </ul>
      </Seccion>

      <Seccion titulo="Quién puede comprar">
        <p>
          Negocios que compran por cajas: caterings, organizadores de eventos, wedding planners, bares y restaurantes. Necesitas
          una cuenta. Vendemos bebidas alcohólicas: solo a mayores de 18 años.
        </p>
      </Seccion>

      <Seccion titulo="Precios">
        <ul>
          <li>Están en soles, por caja y con <strong className="font-medium">IGV incluido</strong>.</li>
          <li>
            Bajan por volumen: el precio de cada producto depende de cuántas cajas de ese producto lleves en el pedido. Sin cuenta
            ves el precio de 1 caja; con cuenta, la escala completa.
          </li>
          <li>
            El precio queda fijo al enviar tu pedido: si la marca lo cambia después, tu pedido no cambia. Mientras tanto, los
            precios valen sujetos al stock del momento.
          </li>
          <li>Las fotos y descripciones las pone cada marca. Si algo no coincide con lo que recibes, aplica la sección de devoluciones.</li>
        </ul>
      </Seccion>

      <Seccion titulo="Stock y pedidos por encargo">
        <ul>
          <li>Lo que tiene stock es compra directa: lo pagas al enviar el pedido y se aparta para ti.</li>
          <li>
            Si pides más de lo que hay, lo que falta va como <strong className="font-medium">encargo</strong>: cada marca lo acepta
            (con la fecha en que lo tendrá listo) o lo rechaza. Lo pagas recién cuando las marcas confirman.
          </li>
          <li>
            Si en tu pedido hay de ambos, eliges: recibir ahora lo que hay y después el resto, o todo junto cuando esté completo.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="Pago">
        <p>
          Yape, Plin, transferencia o tarjeta. En el prototipo el pago es <strong className="font-medium">simulado</strong>: no se
          cobra dinero real. Surtiba no guarda datos de tarjetas.
        </p>
      </Seccion>

      <Seccion titulo="Envío y entrega">
        <ul>
          <li>Entregamos en Lima Metropolitana y el Callao.</li>
          <li>
            Eliges la fecha deseada de entrega, desde el día siguiente. Surtiba coordina con cada marca para llegar a esa fecha,
            pero no la garantiza: si algo cambia, lo ves en «Mis pedidos». Los encargos llegan después de la fecha que confirma
            cada marca.
          </li>
          <li>El costo de envío está por definir: hoy figura como S/ 0.00.</li>
          <li>Sigues tu pedido en «Mis pedidos»: recibido, en preparación, en camino y entregado.</li>
        </ul>
      </Seccion>

      <Seccion titulo="Cancelaciones y cambios">
        <ul>
          <li>
            Si una marca no puede atender su parte, esa parte sale del pedido, el total se recalcula y lo apartado vuelve al stock.
          </li>
          <li>Si ya habías pagado esa parte, queda como saldo a favor y Surtiba te lo devuelve.</li>
          <li>Surtiba puede cancelar un pedido o una parte, y te avisa con el motivo.</li>
        </ul>
      </Seccion>

      <Seccion titulo="Devoluciones">
        <p>Al recibir, revisa las cajas. Aceptamos devoluciones solo si un producto llegó:</p>
        <ul>
          <li>roto o dañado,</li>
          <li>vencido, o</li>
          <li>distinto a lo que pediste (otro producto, otra presentación o menos cajas).</li>
        </ul>
        <p>
          Avísanos dentro de las <strong className="font-medium">48 horas</strong> siguientes a la entrega, con el código del pedido y,
          si puedes, fotos. Surtiba revisa el caso con la marca y repone el producto o te devuelve lo pagado por esas cajas. No hay
          devoluciones por cambio de opinión ni de cajas ya abiertas en buen estado.
        </p>
      </Seccion>

      <Seccion titulo="Reclamos y quejas">
        <p>
          Puedes registrar un reclamo o una queja en el{" "}
          <Link href="/libro-de-reclamaciones" className={enlace}>
            Libro de Reclamaciones
          </Link>
          . Te respondemos en un máximo de {DIAS_HABILES_RESPUESTA} días hábiles.
        </p>
      </Seccion>

      <Seccion titulo="Tus datos">
        <p>
          Cómo usamos y cuidamos tus datos está en la{" "}
          <Link href="/privacidad" className={enlace}>
            Política de privacidad
          </Link>
          .
        </p>
      </Seccion>
    </PaginaLegal>
  );
}
