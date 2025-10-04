import { ActivityIndicator, ColorValue, StyleSheet, View } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

type CenteredActivityIndicatorProps = {
  size?: 'small' | 'large' | number;
  color?: ColorValue;
};

export function CenteredActivityIndicator({ size, color }: CenteredActivityIndicatorProps) {  
  const activityColor = useThemeColor({}, 'tint');
  return (
    <View style={styles.activityIndicatorContainer}>
      <ActivityIndicator size={size} color={color ?? activityColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  activityIndicatorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
