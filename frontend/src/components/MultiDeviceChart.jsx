import React from 'react';
export default function MultiDeviceChart(props) {
  return React.createElement('div', {className: 'card chart'},
    React.createElement('h4', null, props.title || 'Chart'),
    React.createElement('div', {className: 'no-chart-data'}, 'No data')
  );
}
