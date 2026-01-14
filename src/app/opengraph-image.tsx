import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Goban Web - Free Online Go Board';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fef3c7',
          backgroundImage: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
        }}
      >
        {/* Go Board */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#DEB887',
            borderRadius: '16px',
            padding: '30px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            marginBottom: '30px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} style={{ display: 'flex', gap: '20px' }}>
                {[0, 1, 2, 3, 4].map((col) => {
                  const isBlack = (row === 1 && col === 1) || (row === 2 && col === 3) || (row === 3 && col === 1);
                  const isWhite = (row === 1 && col === 3) || (row === 2 && col === 2) || (row === 3 && col === 3);

                  return (
                    <div
                      key={col}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: isBlack ? '#1a1a1a' : isWhite ? '#f5f5f5' : 'transparent',
                        border: isWhite ? '2px solid #d0d0d0' : 'none',
                        boxShadow: (isBlack || isWhite) ? '2px 2px 4px rgba(0,0,0,0.3)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {!isBlack && !isWhite && (
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#8B7355',
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: '#27272a',
              marginBottom: '10px',
            }}
          >
            Goban Web
          </div>
          <div
            style={{
              fontSize: '32px',
              color: '#52525b',
            }}
          >
            Free Online Go Board - No Login Required
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
