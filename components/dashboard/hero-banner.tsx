export function HeroBanner() {
  return (
    <div className="relative flex min-w-0 flex-1 items-center justify-center gap-4 px-2 py-2 lg:gap-6">
      <img
        src="/banner-boy.png"
        alt="Học sinh nam cầm cúp"
        className="hidden h-40 w-auto shrink-0 object-contain mix-blend-multiply lg:block xl:h-48"
      />

      <div className="max-w-lg text-center">
        <h2 className="font-display text-3xl font-extrabold leading-[1.15] sm:text-4xl xl:text-[2.6rem]">
          <span className="block text-brand">Ai sẽ là người</span>
          <span className="block text-accent-pink">toả sáng</span>
          <span className="block text-brand">hôm nay nhỉ?</span>
        </h2>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-500 sm:text-base">
          Cùng học tốt · Tích điểm · Nhận huy hiệu · Đổi quà
        </p>
      </div>

      <img
        src="/banner-girl.png"
        alt="Học sinh nữ vẫy tay"
        className="hidden h-40 w-auto shrink-0 object-contain mix-blend-multiply lg:block xl:h-48"
      />
    </div>
  )
}
