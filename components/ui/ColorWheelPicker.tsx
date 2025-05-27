import React, { useState, useRef } from 'react';
import {
  View,
  PanResponder,
  Dimensions,
  StyleSheet,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, G, Path } from 'react-native-svg';

interface ColorWheelPickerProps {
  size?: number;
  onColorChange: (color: string) => void;
  initialColor?: string;
}

const ColorWheelPicker: React.FC<ColorWheelPickerProps> = ({
  size = 200,
  onColorChange,
  initialColor = '#5bb9a3',
}) => {
  const [selectedHue, setSelectedHue] = useState(170);
  const [selectedSaturation, setSelectedSaturation] = useState(50);
  const [thumbPosition, setThumbPosition] = useState({ x: size / 2, y: size / 2 });
  
  const center = size / 2;
  const radius = size / 2 - 20;

  // Convert HSL to RGB
  const hslToRgb = (h: number, s: number, l: number) => {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  };

  // Convert RGB to HEX
  const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  // Get color from position
  const getColorFromPosition = (x: number, y: number) => {
    const dx = x - center;
    const dy = y - center;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= radius) {
      // Calculate hue from angle
      let angle = Math.atan2(dy, dx);
      if (angle < 0) angle += 2 * Math.PI;
      const hue = (angle * 180 / Math.PI + 90) % 360;

      // Calculate saturation from distance
      const saturation = Math.min(100, (distance / radius) * 100);

      setSelectedHue(hue);
      setSelectedSaturation(saturation);

      const rgb = hslToRgb(hue, saturation, 50);
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      onColorChange(hex);

      return { x, y };
    }

    return null;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newPosition = getColorFromPosition(locationX, locationY);
        if (newPosition) {
          setThumbPosition(newPosition);
        }
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newPosition = getColorFromPosition(locationX, locationY);
        if (newPosition) {
          setThumbPosition(newPosition);
        }
      },
    })
  ).current;

  // Generate wheel segments
  const generateWheel = () => {
    const segments = [];
    const numSegments = 360;

    for (let i = 0; i < numSegments; i++) {
      const startAngle = (i * 360) / numSegments;
      const endAngle = ((i + 1) * 360) / numSegments;
      
      const startAngleRad = (startAngle - 90) * (Math.PI / 180);
      const endAngleRad = (endAngle - 90) * (Math.PI / 180);

      const x1 = center + radius * Math.cos(startAngleRad);
      const y1 = center + radius * Math.sin(startAngleRad);
      const x2 = center + radius * Math.cos(endAngleRad);
      const y2 = center + radius * Math.sin(endAngleRad);

      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

      const pathData = [
        `M ${center} ${center}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        "Z"
      ].join(" ");

      const rgb = hslToRgb(startAngle, 100, 50);
      const color = rgbToHex(rgb.r, rgb.g, rgb.b);

      segments.push(
        <Path
          key={i}
          d={pathData}
          fill={color}
          opacity={0.9}
        />
      );
    }

    return segments;
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View {...panResponder.panHandlers}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="saturation" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="white" stopOpacity="1" />
              <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          
          {/* Color wheel */}
          <G>{generateWheel()}</G>
          
          {/* White center gradient for saturation */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="url(#saturation)"
            opacity={0.8}
          />
          
          {/* Center white circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius * 0.3}
            fill="white"
          />
          
          {/* Selection thumb */}
          <Circle
            cx={thumbPosition.x}
            cy={thumbPosition.y}
            r={10}
            fill="transparent"
            stroke="white"
            strokeWidth={3}
          />
          <Circle
            cx={thumbPosition.x}
            cy={thumbPosition.y}
            r={8}
            fill="transparent"
            stroke="black"
            strokeWidth={1}
          />
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ColorWheelPicker;