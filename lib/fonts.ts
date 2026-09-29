/**
 * Kendi sunucumuzdan servis edilen font tanımları (next/font).
 * next/font, çağrıların derleme anında statik olarak çözülebilmesini ister; bu yüzden her font
 * ayrı ve sabit argümanlarla tanımlanır. Anahtarlar lib/font-catalog.ts ile birebir aynıdır.
 * preload: false — yalnızca sayfada gerçekten kullanılan fontlar indirilir.
 */
import {
  Archivo_Black,
  Bebas_Neue,
  Caveat,
  DM_Sans,
  Dancing_Script,
  Fira_Code,
  Great_Vibes,
  Inter,
  JetBrains_Mono,
  Lato,
  Libre_Baskerville,
  Lobster,
  Lora,
  Manrope,
  Merriweather,
  Montserrat,
  Nunito,
  Open_Sans,
  Oswald,
  Outfit,
  Pacifico,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Poppins,
  Raleway,
  Roboto,
  Rubik,
  Space_Grotesk,
  Work_Sans,
} from "next/font/google";

const poppins = Poppins({
  variable: "--font-f-poppins",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});
const inter = Inter({ variable: "--font-f-inter", subsets: ["latin", "latin-ext"], display: "swap", preload: false });
const roboto = Roboto({ variable: "--font-f-roboto", subsets: ["latin", "latin-ext"], display: "swap", preload: false });
const openSans = Open_Sans({ variable: "--font-f-open-sans", subsets: ["latin", "latin-ext"], display: "swap", preload: false });
const montserrat = Montserrat({
  variable: "--font-f-montserrat",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});
const nunito = Nunito({ variable: "--font-f-nunito", subsets: ["latin", "latin-ext"], display: "swap", preload: false });
const raleway = Raleway({ variable: "--font-f-raleway", subsets: ["latin", "latin-ext"], display: "swap", preload: false });
const lato = Lato({
  variable: "--font-f-lato",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
const workSans = Work_Sans({ variable: "--font-f-work-sans", subsets: ["latin", "latin-ext"], display: "swap", preload: false });
const dmSans = DM_Sans({ variable: "--font-f-dm-sans", subsets: ["latin", "latin-ext"], display: "swap", preload: false });
const manrope = Manrope({ variable: "--font-f-manrope", subsets: ["latin", "latin-ext"], display: "swap", preload: false });
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-f-plus-jakarta-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});
const rubik = Rubik({ variable: "--font-f-rubik", subsets: ["latin", "latin-ext"], display: "swap", preload: false });
const outfit = Outfit({ variable: "--font-f-outfit", subsets: ["latin", "latin-ext"], display: "swap", preload: false });
const spaceGrotesk = Space_Grotesk({
  variable: "--font-f-space-grotesk",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});
const playfairDisplay = Playfair_Display({
  variable: "--font-f-playfair-display",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});
const merriweather = Merriweather({
  variable: "--font-f-merriweather",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});
const lora = Lora({ variable: "--font-f-lora", subsets: ["latin", "latin-ext"], display: "swap", preload: false });
const libreBaskerville = Libre_Baskerville({
  variable: "--font-f-libre-baskerville",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});
const oswald = Oswald({ variable: "--font-f-oswald", subsets: ["latin", "latin-ext"], display: "swap", preload: false });
const bebasNeue = Bebas_Neue({
  variable: "--font-f-bebas-neue",
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
  preload: false,
});
const archivoBlack = Archivo_Black({
  variable: "--font-f-archivo-black",
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
  preload: false,
});
const pacifico = Pacifico({
  variable: "--font-f-pacifico",
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
  preload: false,
});
const dancingScript = Dancing_Script({
  variable: "--font-f-dancing-script",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});
const caveat = Caveat({ variable: "--font-f-caveat", subsets: ["latin", "latin-ext"], display: "swap", preload: false });
const lobster = Lobster({
  variable: "--font-f-lobster",
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
  preload: false,
});
const greatVibes = Great_Vibes({
  variable: "--font-f-great-vibes",
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
  preload: false,
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-f-jetbrains-mono",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});
const firaCode = Fira_Code({ variable: "--font-f-fira-code", subsets: ["latin", "latin-ext"], display: "swap", preload: false });

/** <html> etiketine eklenen sınıflar: yalnızca CSS değişkenlerini tanımlar. */
export const fontVariables = [
  poppins.variable,
  inter.variable,
  roboto.variable,
  openSans.variable,
  montserrat.variable,
  nunito.variable,
  raleway.variable,
  lato.variable,
  workSans.variable,
  dmSans.variable,
  manrope.variable,
  plusJakartaSans.variable,
  rubik.variable,
  outfit.variable,
  spaceGrotesk.variable,
  playfairDisplay.variable,
  merriweather.variable,
  lora.variable,
  libreBaskerville.variable,
  oswald.variable,
  bebasNeue.variable,
  archivoBlack.variable,
  pacifico.variable,
  dancingScript.variable,
  caveat.variable,
  lobster.variable,
  greatVibes.variable,
  jetbrainsMono.variable,
  firaCode.variable,
].join(" ");
