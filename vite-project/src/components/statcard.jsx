export default function StatCard({ title, value, unit, onClick, isSelected, info }) {
  return (
    <div 
      className={`card stat-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="card-header">
        <h4>{title}</h4>
        <span className="info-icon">ℹ️</span>
      </div>
      <p className="value">
        {value ?? "--"} <span>{unit}</span>
      </p>
      {isSelected && info && (
        <div className="card-tooltip">
          <p className="tooltip-title">{title} Information</p>
          <p><strong>Description:</strong> {info.description}</p>
          <p><strong>Range:</strong> {info.range}</p>
          <p className="tooltip-tip">💡 {info.tips}</p>
        </div>
      )}
    </div>
  );
}
