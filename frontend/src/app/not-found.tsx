import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
      <div className="text-6xl">🔍</div>
      <h2 className="text-2xl font-bold text-gray-300">页面未找到</h2>
      <p className="text-gray-500">您访问的页面不存在</p>
      <Link href="/" className="btn-primary text-sm px-6 py-2">
        返回首页
      </Link>
    </div>
  )
}
