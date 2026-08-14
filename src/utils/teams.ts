export function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Không xác định'

  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Vừa xong'
  
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} giờ trước`

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays === 1) return 'Hôm qua'
  if (diffInDays < 30) return `${diffInDays} ngày trước`

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) return `${diffInMonths} tháng trước`

  return `${Math.floor(diffInMonths / 12)} năm trước`
}

export function getTeamMotivationMessage(rank: number, totalTeams: number, championsCount: number = 0): string {
  if (totalTeams === 0) return 'Cố gắng lên nhé!'
  
  // Top 1
  if (rank === 0) return 'Tuyệt vời! Đang dẫn đầu!'
  
  // Top 2 or 3
  if (rank <= 2) return 'Cố lên, sắp bứt phá rồi!'
  
  if (championsCount > 0) return `${championsCount} quán quân xuất hiện!`
  
  // Bottom half
  if (rank > totalTeams / 2) return 'Cố gắng lên nhé!'
  
  return 'Giữ vững phong độ!'
}
