import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  BadgeCheck,
  ExternalLink,
  Scale,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { Disclaimer } from "@/components/layout/disclaimer";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { pageCtaItems } from "@/lib/page-cta-i18n";
import { getExnessAffiliateUrl } from "@/lib/exness-affiliate";
import { absoluteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

type Broker = {
  name: string;
  score: number;
  account: string;
  spread: string;
  regulation: string;
  minDeposit: string;
  platforms: string;
  bestFor: string;
  note: string;
  pros: string[];
  cons: string[];
  url: string;
  sourceUrl: string;
  affiliate?: boolean;
  featured?: boolean;
};

const officialUrls = {
  exnessAccounts: "https://www.exness.com/standard-accounts/",
  exnessRegulation: "https://www.exness.com/regulation/",
  icAccounts: "https://www.icmarkets.com/global/en/trading-accounts/overview",
  pepperstoneAccounts: "https://pepperstone.com/en/ways-to-trade/trading-accounts/",
  xmAccounts: "https://www.xm.com/account-types",
  fxtmAccounts: "https://www.fxtm.com/en/trading/accounts/",
  icRegulation: "https://www.icmarkets.com/global/en/company/regulation",
  pepperstoneRegulation:
    "https://pepperstone.com/en/help-and-support/opening-an-account/is-pepperstone-licensed-and-regulated/",
  xmRegulation: "https://www.xm.com/regulation",
};

function makeCopy(locale: string, exnessAffiliateUrl: string) {
  const vi = locale === "vi";

  return {
    eyebrow: vi ? "Danh sách tham khảo cho trader Việt" : "Reference list for retail traders",
    title: vi ? "So sánh sàn Forex uy tín" : "Trusted Forex Broker Comparison",
    description: vi
      ? "Chọn sàn theo mục tiêu: người mới cần demo/nạp rút dễ, scalper cần spread thấp, trader có kinh nghiệm cần nền tảng và pháp lý rõ. Thông tin bên dưới dựa trên dữ liệu công khai từ website chính thức của từng sàn."
      : "Choose by use case: beginners need easy demo and funding, scalpers need low spreads, experienced traders need platforms and clear regulation. The data below is based on publicly available broker information.",
    affiliateNotice: vi
      ? "Disclosure: nút Exness là link affiliate. Social Forex có thể nhận hoa hồng nếu bạn đăng ký, không làm tăng chi phí của bạn. Các sàn còn lại đang dùng link chính thức, không phải affiliate."
      : "Disclosure: the Exness button is an affiliate link. Social Forex may earn a commission if you register, at no extra cost to you. Other broker links are official non-affiliate links.",
    methodology: vi
      ? "Cách chấm điểm: ưu tiên giấy phép/pháp nhân, chi phí giao dịch công khai, nền tảng MT4/MT5/TradingView, nạp rút, và độ phù hợp với người mới. Không có sàn nào phù hợp với tất cả mọi người."
      : "Scoring weighs regulation footprint, published trading costs, MT4/MT5/TradingView support, funding, and beginner fit. No single broker fits everyone.",
    quickPick: vi ? "Gợi ý nhanh" : "Quick Picks",
    compare: vi ? "Bảng so sánh nhanh" : "Quick Comparison",
    details: vi ? "Chi tiết từng sàn" : "Broker Details",
    sourcesTitle: vi ? "Nguồn tham khảo chính thức" : "Official Sources",
    sourceHint: vi
      ? "Điều kiện tài khoản, spread và pháp nhân có thể thay đổi theo quốc gia. Luôn kiểm tra lại ở màn hình đăng ký thật trước khi nạp tiền."
      : "Account conditions, spreads, and legal entities can vary by country. Always verify the exact onboarding entity before depositing.",
    labels: {
      partner: vi ? "Partner" : "Partner",
      official: vi ? "Chính thức" : "Official",
      score: vi ? "Độ phù hợp" : "Fit score",
      account: vi ? "Tài khoản nổi bật" : "Main account",
      spread: vi ? "Spread tham khảo" : "Indicative spread",
      regulation: vi ? "Pháp lý/pháp nhân" : "Regulation/entity",
      minDeposit: vi ? "Nạp tối thiểu" : "Min. deposit",
      platforms: vi ? "Nền tảng" : "Platforms",
      bestFor: vi ? "Phù hợp với" : "Best for",
      pros: vi ? "Điểm mạnh" : "Pros",
      cons: vi ? "Cần lưu ý" : "Watch-outs",
      open: vi ? "Mở tài khoản" : "Open account",
      visit: vi ? "Xem trang chính thức" : "Visit official site",
      source: vi ? "Nguồn" : "Source",
    },
    quickPicks: [
      {
        title: vi ? "Người mới / demo XAUUSD" : "Beginners / XAUUSD demo",
        broker: "Exness",
        reason: vi
          ? "Dễ bắt đầu với Standard, MT5 và lộ trình demo trên Social Forex."
          : "Easy start with Standard, MT5, and the Social Forex demo path.",
      },
      {
        title: vi ? "Scalping, EA, spread thấp" : "Scalping, EAs, low spread",
        broker: "IC Markets",
        reason: vi
          ? "Raw Spread có spread EUR/USD trung bình rất thấp, phù hợp trader đã hiểu commission."
          : "Raw Spread account has very low average EUR/USD spread for traders who understand commissions.",
      },
      {
        title: vi ? "TradingView + nhiều giấy phép" : "TradingView + broad regulation",
        broker: "Pepperstone",
        reason: vi
          ? "Razor hỗ trợ TradingView, raw spread và nhiều pháp nhân được quản lý."
          : "Razor supports TradingView, raw spreads, and multiple regulated entities.",
      },
    ],
    brokers: [
      {
        name: "Exness",
        score: 4.6,
        account: vi ? "Standard / Raw Spread" : "Standard / Raw Spread",
        spread: vi ? "Standard từ 0.2 pip; Zero/Raw tùy sản phẩm" : "Standard from 0.2 pips; Zero/Raw varies",
        regulation: vi
          ? "Nhiều pháp nhân; trader Việt thường cần kiểm tra entity khi đăng ký"
          : "Multiple entities; verify your onboarding entity",
        minDeposit: vi ? "Standard từ khoảng $10; Pro từ ~$200 tùy khu vực" : "Standard around $10; Pro from ~$200 by region",
        platforms: "MT4, MT5, Exness Terminal",
        bestFor: vi ? "Người mới, demo, nạp/rút nhanh, XAUUSD" : "Beginners, demo, fast funding, XAUUSD",
        note: vi
          ? "Là sàn partner trên Social Forex. Phù hợp làm lộ trình demo nhưng vẫn phải kiểm tra spread/swap trên tài khoản thật."
          : "Social Forex partner broker. Good for the demo path, but still verify live spread/swap on your account.",
        pros: vi
          ? ["Dễ bắt đầu với MT5 demo", "Tài khoản Standard thân thiện người mới", "Có link hướng dẫn Exness + MT5 trên site"]
          : ["Easy MT5 demo start", "Beginner-friendly Standard account", "Supported by the Exness + MT5 guide on this site"],
        cons: vi
          ? ["Đòn bẩy cao có thể làm cháy tài khoản nhanh", "Điều kiện pháp nhân khác nhau theo quốc gia"]
          : ["High leverage can increase loss speed", "Legal entity differs by country"],
        url: exnessAffiliateUrl,
        sourceUrl: officialUrls.exnessAccounts,
        affiliate: true,
        featured: true,
      },
      {
        name: "IC Markets",
        score: 4.5,
        account: "Raw Spread",
        spread: vi ? "Từ 0.0 pip; EUR/USD trung bình khoảng 0.1 pip + commission" : "From 0.0 pips; avg EUR/USD around 0.1 pips + commission",
        regulation: vi ? "FSA Seychelles; có pháp nhân EU/AU riêng tùy khu vực" : "FSA Seychelles; EU/AU entities vary by region",
        minDeposit: "$200",
        platforms: "MT4, MT5, cTrader, TradingView",
        bestFor: vi ? "Scalping, EA, trader quan tâm chi phí" : "Scalping, EAs, cost-focused traders",
        note: vi
          ? "Mạnh về raw spread và nền tảng. Người mới cần hiểu commission trước khi so sánh với tài khoản Standard."
          : "Strong raw spread and platform mix. Beginners should understand commission before comparing to Standard accounts.",
        pros: vi
          ? ["Chi phí raw spread cạnh tranh", "Nhiều nền tảng cho trader kỹ thuật", "Phù hợp scalping/EA"]
          : ["Competitive raw-spread pricing", "Many platforms for technical traders", "Good fit for scalping/EAs"],
        cons: vi
          ? ["Nạp tối thiểu cao hơn Exness/XM", "Commission làm người mới khó so chi phí tổng"]
          : ["Higher minimum deposit than Exness/XM", "Commission makes total cost harder for beginners"],
        url: "https://www.icmarkets.com/global/en/",
        sourceUrl: officialUrls.icAccounts,
      },
      {
        name: "Pepperstone",
        score: 4.4,
        account: "Razor",
        spread: vi ? "Raw spread từ 0.0; commission FX tùy nền tảng" : "Raw spreads from 0.0; FX commission varies by platform",
        regulation: vi ? "FCA, ASIC, CySEC, DFSA, BaFin, CMA, SCB tùy entity" : "FCA, ASIC, CySEC, DFSA, BaFin, CMA, SCB by entity",
        minDeposit: vi ? "Không yêu cầu số dư mở tài khoản tối thiểu" : "No minimum opening balance",
        platforms: "MT4, MT5, cTrader, TradingView",
        bestFor: vi ? "Trader thích TradingView/cTrader và pháp lý rộng" : "TradingView/cTrader users and regulation-focused traders",
        note: vi
          ? "Điểm mạnh là nền tảng đa dạng và raw pricing. Phù hợp trader đã biết chọn account Standard/Razor."
          : "Strong platform range and raw pricing. Best for traders who can choose between Standard/Razor pricing.",
        pros: vi
          ? ["Có TradingView", "Nhiều pháp nhân được quản lý", "Không yêu cầu số dư mở tài khoản tối thiểu"]
          : ["TradingView support", "Broad regulated-entity footprint", "No minimum opening balance"],
        cons: vi
          ? ["Thông tin phí cần kiểm tra theo nền tảng", "Không phải lựa chọn đơn giản nhất cho người mới hoàn toàn"]
          : ["Fees need checking by platform", "Not the simplest option for absolute beginners"],
        url: "https://pepperstone.com/en/",
        sourceUrl: officialUrls.pepperstoneAccounts,
      },
      {
        name: "XM",
        score: 4.0,
        account: "Ultra Low",
        spread: vi ? "Ultra Low tập trung giảm chi phí; spread thực tế tùy symbol" : "Ultra Low targets lower costs; actual spread varies by symbol",
        regulation: vi ? "CySEC; pháp nhân quốc tế tùy khu vực" : "CySEC; international entities vary by region",
        minDeposit: "$5",
        platforms: "MT4, MT5",
        bestFor: vi ? "Tài khoản nhỏ, học thao tác MT4/MT5" : "Small accounts and MT4/MT5 practice",
        note: vi
          ? "Dễ tiếp cận với nạp tối thiểu thấp. Nên tránh bị bonus làm lệch quản trị rủi ro."
          : "Accessible with low minimum deposit. Avoid letting bonuses distort risk management.",
        pros: vi
          ? ["Nạp tối thiểu thấp", "Có MT4/MT5", "Phù hợp luyện thao tác với vốn nhỏ"]
          : ["Low minimum deposit", "MT4/MT5 available", "Good for small-account practice"],
        cons: vi
          ? ["Spread/điều kiện tùy loại tài khoản", "Bonus không thay thế quản trị vốn"]
          : ["Spread/conditions vary by account", "Bonuses do not replace risk management"],
        url: "https://www.xm.com/",
        sourceUrl: officialUrls.xmAccounts,
      },
      {
        name: "FXTM",
        score: 3.8,
        account: "Edge / Advantage",
        spread: vi ? "Edge từ 1.2 pip; Advantage từ 0.0 + commission" : "Edge from 1.2 pips; Advantage from 0.0 + commission",
        regulation: vi ? "Pháp nhân tùy khu vực; cần kiểm tra tại đăng ký" : "Entity varies by region; verify during signup",
        minDeposit: vi ? "$50 Edge; $200 Advantage" : "$50 Edge; $200 Advantage",
        platforms: "MT4, MT5",
        bestFor: vi ? "Người mới muốn tài liệu/hệ sinh thái học thêm" : "Beginners who want more education/tools",
        note: vi
          ? "Có account beginner nhưng điều kiện từng tài khoản khác nhau khá nhiều, nên đọc kỹ trước khi nạp."
          : "Has beginner accounts, but account conditions differ significantly. Read details before funding.",
        pros: vi
          ? ["Có lựa chọn account cho người mới", "Có MT4/MT5", "Tài liệu và công cụ học khá nhiều"]
          : ["Beginner account options", "MT4/MT5 available", "Education and tools available"],
        cons: vi
          ? ["Chi phí tốt nhất thường nằm ở account cao hơn", "Cần kiểm tra kỹ pháp nhân được mở"]
          : ["Best pricing usually sits on higher-tier accounts", "Onboarding entity needs careful checking"],
        url: "https://www.fxtm.com/en",
        sourceUrl: officialUrls.fxtmAccounts,
      },
    ] satisfies Broker[],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("brokers");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: absoluteUrl("/brokers", locale) },
  };
}

function ScoreDots({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${score}/5`}>
      {[1, 2, 3, 4, 5].map((item) => (
        <span
          key={item}
          className={cn(
            "size-2 rounded-full",
            score >= item ? "bg-primary" : score >= item - 0.5 ? "bg-primary/45" : "bg-muted",
          )}
        />
      ))}
      <span className="ml-1 font-mono text-xs text-muted-foreground">{score.toFixed(1)}</span>
    </div>
  );
}

export default async function BrokersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tCommon = await getTranslations("common");
  const ctaRow = await pageCtaItems("risk", "explore");
  const copy = makeCopy(locale, getExnessAffiliateUrl());

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <Badge variant="outline" className="gap-1">
          <ShieldCheck className="size-3" aria-hidden />
          {copy.eyebrow}
        </Badge>
        <div className="max-w-3xl">
          <h1 className="font-heading text-xl font-semibold text-foreground">
            {copy.title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
            {copy.description}
          </p>
        </div>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-800 dark:text-amber-100">
          {copy.affiliateNotice}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {copy.quickPicks.map((item) => (
          <div key={item.title} className="rounded-lg border border-border bg-card p-4">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" aria-hidden />
              {item.title}
            </p>
            <h2 className="mt-2 text-base font-semibold text-foreground">{item.broker}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.reason}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Scale className="size-4 text-primary" aria-hidden />
          <h2 className="font-heading text-lg font-semibold text-foreground">{copy.compare}</h2>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {copy.methodology}
        </p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{copy.labels.score}</th>
                <th className="px-4 py-3">Broker</th>
                <th className="px-4 py-3">{copy.labels.account}</th>
                <th className="px-4 py-3">{copy.labels.spread}</th>
                <th className="px-4 py-3">{copy.labels.minDeposit}</th>
                <th className="px-4 py-3">{copy.labels.platforms}</th>
                <th className="px-4 py-3">{copy.labels.bestFor}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {copy.brokers.map((broker) => (
                <tr key={broker.name} className="hover:bg-muted/30">
                  <td className="px-4 py-3"><ScoreDots score={broker.score} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      {broker.name}
                      {broker.affiliate && <Badge>{copy.labels.partner}</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">{broker.account}</td>
                  <td className="px-4 py-3 text-muted-foreground">{broker.spread}</td>
                  <td className="px-4 py-3 font-mono">{broker.minDeposit}</td>
                  <td className="px-4 py-3">{broker.platforms}</td>
                  <td className="px-4 py-3 text-muted-foreground">{broker.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BadgeCheck className="size-4 text-primary" aria-hidden />
          <h2 className="font-heading text-lg font-semibold text-foreground">{copy.details}</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {copy.brokers.map((broker) => (
            <article
              key={broker.name}
              className={cn(
                "rounded-xl border bg-card p-5",
                broker.featured ? "border-primary/50 ring-1 ring-primary/20" : "border-border",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading text-lg font-semibold text-foreground">
                      {broker.name}
                    </h3>
                    <Badge variant={broker.affiliate ? "default" : "outline"}>
                      {broker.affiliate ? copy.labels.partner : copy.labels.official}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{broker.note}</p>
                </div>
                <ScoreDots score={broker.score} />
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                {[
                  [copy.labels.regulation, broker.regulation],
                  [copy.labels.minDeposit, broker.minDeposit],
                  [copy.labels.platforms, broker.platforms],
                  [copy.labels.bestFor, broker.bestFor],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border bg-background/35 p-3">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-1 text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                    <ShieldCheck className="size-3.5 text-emerald-400" aria-hidden />
                    {copy.labels.pros}
                  </p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {broker.pros.map((item) => <li key={item}>- {item}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                    <WalletCards className="size-3.5 text-amber-400" aria-hidden />
                    {copy.labels.cons}
                  </p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {broker.cons.map((item) => <li key={item}>- {item}</li>)}
                  </ul>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href={broker.url}
                  target="_blank"
                  rel={broker.affiliate ? "sponsored noopener noreferrer" : "noopener noreferrer"}
                  className={cn(buttonVariants({ variant: broker.affiliate ? "default" : "outline", size: "sm" }))}
                >
                  {broker.affiliate ? copy.labels.open : copy.labels.visit}
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
                <a
                  href={broker.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                >
                  {copy.labels.source}
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-muted/15 p-5">
        <h2 className="font-heading text-base font-semibold text-foreground">
          {copy.sourcesTitle}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.sourceHint}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries({
            Exness: officialUrls.exnessAccounts,
            "Exness regulation": officialUrls.exnessRegulation,
            "IC Markets": officialUrls.icAccounts,
            "IC Markets regulation": officialUrls.icRegulation,
            Pepperstone: officialUrls.pepperstoneAccounts,
            "Pepperstone regulation": officialUrls.pepperstoneRegulation,
            XM: officialUrls.xmAccounts,
            "XM regulation": officialUrls.xmRegulation,
            FXTM: officialUrls.fxtmAccounts,
          }).map(([name, url]) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {name}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ))}
        </div>
      </section>

      <Disclaimer variant="compact" />
      <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaRow} />
    </div>
  );
}
