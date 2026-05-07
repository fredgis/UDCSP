import React from 'react';
import { render } from '@testing-library/react-native';
import { AccessibleButton } from '../src/components/AccessibleButton';
test('button exposes accessible label', () => { const screen = render(<AccessibleButton label="Continue" />); expect(screen.getByLabelText('Continue')).toBeTruthy(); });
