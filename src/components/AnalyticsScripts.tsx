import Script from "next/script";

const GTM_ID = "GTM-T4HCJBMF";
const GA4_IDS = ["G-B4PQKLZ2BF", "G-KD6C514Q1Q"];
const ADS_ID = "AW-18429943837";
const COOKIEBOT_ID = "dafec895-e2af-4e2e-a904-ea3c9f12380e";

export function AnalyticsScripts() {
  return (
    <>
      <Script
        id="cookiebot"
        src="https://consent.cookiebot.com/uc.js"
        data-cbid={COOKIEBOT_ID}
        data-blockingmode="auto"
        strategy="beforeInteractive"
      />
      <Script id="gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
      <Script
        id="gtag-src"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_IDS[0]}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function gtag(){window.dataLayer.push(arguments);};
gtag('js', new Date());
gtag('config', '${GA4_IDS[0]}');
gtag('config', '${GA4_IDS[1]}');
gtag('config', '${ADS_ID}', { allow_enhanced_conversions: true });`}
      </Script>
    </>
  );
}
