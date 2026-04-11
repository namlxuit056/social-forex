export const metadata = { title: "Backtest" };

export default function BacktestPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Backtest (kế hoạch)</h1>
        <p className="mt-2 max-w-2xl text-zinc-400">
          Module nặng: cần kho lịch sử OHLC chất lượng, engine tính lệnh, và giới
          hạn tài nguyên CPU. Giai đoạn sau: đồ thị equity, thống kê drawdown,
          export CSV.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-zinc-700 p-10 text-center text-zinc-500">
        Chưa triển khai — placeholder kiến trúc.
      </div>
    </div>
  );
}
