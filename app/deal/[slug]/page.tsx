import DealPage, { generateMetadata, generateStaticParams } from "../deals/[slug]/page";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

export { generateMetadata, generateStaticParams };
export default DealPage;
