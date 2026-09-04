import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, TextStyle } from 'react-native';

interface AnimatedIconProps {
  icon: string;
  size?: number;
  focused?: boolean;
  style?: StyleProp<TextStyle>;
}

export function AnimatedIcon({ icon, size = 22, focused = false, style }: AnimatedIconProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.2 : 1.0,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <Animated.Text
      style={[
        styles.defaultIcon,
        { fontSize: size },
        style,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      {icon}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  defaultIcon: {
    textAlign: 'center',
  },
});

export default AnimatedIcon;