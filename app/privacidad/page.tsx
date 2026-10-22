import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal, Seccion } from "@/components/PaginaLegal";
import { EMPRESA, SIN_DATO } from "@/lib/empresa";

export const metadata: Metadata = {
  title: "Política de privacidad · Surtiba",
  description: "Qué datos guarda Surtiba, para qué, quién los ve y cómo ejercer tus derechos (Ley 29733).",
};

const enlace = "font-medium enlace text-verde hover:text-tinta";

// Ley 29733 de Protección de Datos Personales y su reglamento. Lista lo que la app guarda de verdad
// (docs/modelo-datos.md y docs/seguridad.md): si se agrega un dato nuevo, se agrega aquí.
export default function PaginaPrivacidad() {
  return (
    <PaginaLegal
      etiqueta="Legal"
      titulo="Política de privacidad"
      intro={
        <>
          Surtiba es un <strong className="font-medium text-tinta">prototipo del curso</strong>. Te pedimos usar datos de prueba.
          Aun así, tratamos lo que escribas según la Ley 29733 de Protección de Datos Personales.
        </>
      }
    >
      <Seccion titulo="Quién es responsable">
        <ul>
          <li>
            {EMPRESA.nombre} · {EMPRESA.estado}
          </li>
          <li>Razón social y RUC: {EMPRESA.razonSocial ?? SIN_DATO}</li>
          <li>Correo para temas de datos: {EMPRESA.correo ?? SIN_DATO}</li>
        </ul>
        <p>
          Al ser un prototipo, Surtiba todavía no inscribe sus bancos de datos ante la Autoridad Nacional de Protección de Datos
          Personales. Lo hará antes de operar de verdad.
        </p>
      </Seccion>

      <Seccion titulo="Qué datos guardamos">
        <ul>
          <li>
            <strong className="font-medium">Tu cuenta:</strong> correo y contraseña. La contraseña se guarda cifrada: nadie de Surtiba
            puede verla.
          </li>
          <li>
            <strong className="font-medium">Tu perfil:</strong> nombre, empresa, tipo de negocio, WhatsApp, RUC (si lo pones), tu foto
            o logo y tu dirección de entrega habitual.
          </li>
          <li>
            <strong className="font-medium">Tus pedidos:</strong> quién recibe, su celular, la dirección, la fecha de entrega, tu nota y
            los datos del evento si los pones.
          </li>
          <li>
            <strong className="font-medium">Lo que haces en la app:</strong> carrito, favoritos, cotizaciones y avisos.
          </li>
          <li>
            <strong className="font-medium">Reclamos:</strong> lo que escribes en el Libro de Reclamaciones, con tus datos de contacto.
          </li>
          <li>
            <strong className="font-medium">Uso de la página:</strong> páginas vistas (Vercel Web Analytics, sin cookies ni datos
            personales) y tres acciones propias: ver un producto, agregarlo al carrito y empezar a pedir. Si tienes sesión, estas
            acciones quedan ligadas a tu cuenta.
          </li>
        </ul>
        <p>No guardamos datos de tarjetas ni de cuentas bancarias.</p>
      </Seccion>

      <Seccion titulo="Para qué los usamos">
        <ul>
          <li>Atender tus pedidos: cobrarlos, coordinar el recojo con cada marca y entregártelos.</li>
          <li>Avisarte en la app cómo va tu pedido.</li>
          <li>Responder tus reclamos y quejas.</li>
          <li>Mejorar Surtiba con métricas internas (por ejemplo, cuántas cotizaciones terminan en pedido).</li>
        </ul>
        <p>No vendemos tus datos ni los usamos para publicidad.</p>
      </Seccion>

      <Seccion titulo="Quién los ve">
        <ul>
          <li>Tú y el equipo Surtiba.</li>
          <li>
            <strong className="font-medium">Las marcas no ven tus datos</strong>: ni tu nombre, ni tu empresa, ni tu teléfono, ni tu
            dirección. Solo ven las cajas que tienen que preparar.
          </li>
          <li>Tu foto de perfil está en un espacio privado: solo la ven tú y Surtiba.</li>
        </ul>
      </Seccion>

      <Seccion titulo="Dónde se guardan">
        <p>
          Usamos dos proveedores: <strong className="font-medium">Supabase</strong> (base de datos, cuentas y fotos) y{" "}
          <strong className="font-medium">Vercel</strong> (donde funciona la página y sus estadísticas de visitas). Sus servidores
          están en São Paulo, Brasil, así que tus datos salen del Perú (flujo transfronterizo). Las dos son empresas de Estados
          Unidos.
        </p>
      </Seccion>

      <Seccion titulo="Cookies">
        <p>
          Solo usamos las cookies necesarias para mantener tu sesión abierta. No usamos cookies de publicidad ni de seguimiento.
        </p>
      </Seccion>

      <Seccion titulo="Cuánto tiempo">
        <p>Mientras tengas tu cuenta. Los pedidos y reclamos se guardan aunque cierres la cuenta, porque son el registro de la compra.</p>
      </Seccion>

      <Seccion titulo="Tus derechos">
        <p>Puedes pedir ver, corregir o borrar tus datos, u oponerte a que los usemos (derechos ARCO).</p>
        <ul>
          <li>
            Tu perfil lo corriges tú mismo en{" "}
            <Link href="/perfil" className={enlace}>
              Mi perfil
            </Link>
            .
          </li>
          <li>
            Para lo demás, escríbenos{EMPRESA.correo ? ` a ${EMPRESA.correo}` : ""} o usa el{" "}
            <Link href="/libro-de-reclamaciones" className={enlace}>
              Libro de Reclamaciones
            </Link>{" "}
            eligiendo «Queja». Te respondemos dentro de los plazos que fija la ley.
          </li>
          <li>Si no te respondemos, puedes acudir a la Autoridad Nacional de Protección de Datos Personales.</li>
        </ul>
      </Seccion>
    </PaginaLegal>
  );
}
