import { FaWhatsapp } from "react-icons/fa";

const WHATSAPP_NUMBER = "250789408367";
const message = "Hello CANA, I would like to know more about your products and services.";

export default function FloatingWhatsApp() {
  return <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" aria-label="Chat with CANA on WhatsApp" className="group fixed bottom-5 right-5 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)] transition hover:scale-110 hover:bg-[#20bd5a] focus:outline-none focus:ring-4 focus:ring-[#25D366]/30 sm:bottom-7 sm:right-7 sm:h-15 sm:w-15"><span className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 animate-ping" /><FaWhatsapp className="relative h-7 w-7" /><span className="pointer-events-none absolute right-[calc(100%+12px)] top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-950 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100 sm:block">Chat with CANA</span></a>;
}
