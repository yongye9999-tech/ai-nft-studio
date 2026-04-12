interface ErrorProps {
  statusCode?: number
}

export default function Error({ statusCode }: ErrorProps) {
  return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '40px' }}>
      <h1>{statusCode ?? 'Error'}</h1>
      <p>{statusCode === 404 ? 'Page not found' : 'An error occurred'}</p>
    </div>
  )
}

Error.getInitialProps = ({ res, err }: { res?: { statusCode: number }; err?: { statusCode?: number } }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}
