export function HeroBanner() {
  return (
    <div className="relative flex flex-1 items-center justify-center gap-4 px-4">
      {/* Boy */}
      <img
        src="/banner-boy.png"
        alt="Học sinh nam cầm cúp"
        className="hidden h-40 w-auto shrink-0 object-contain mix-blend-multiply lg:block"
      />

      {/* Center text */}
      <div className="text-center">
        <h2 className="font-display text-3xl font-extrabold leading-tight xl:text-4xl">
          <span className="block whitespace-nowrap text-sky-500">Ai sẽ là người</span>
          <span className="block whitespace-nowrap text-amber-500">toả sáng</span>
          <span className="block whitespace-nowrap text-sky-500">hôm nay nhỉ?</span>
        </h2>
        <div className="mt-3 space-y-0.5 text-sm font-semibold text-slate-500">
          <p>Cùng nhau học tập thật tốt</p>
          <p>– Tích điểm thật nhiều</p>
          <p>– Nhận huy hiệu – Đổi quà hấp dẫn!</p>
        </div>
      </div>

      {/* Girl */}
      <img
        src="/banner-girl.png"
        alt="Học sinh nữ vẫy tay"
        className="hidden h-40 w-auto shrink-0 object-contain mix-blend-multiply lg:block"
      />
    </div>
  )
}
