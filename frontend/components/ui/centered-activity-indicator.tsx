import { ActivityIndicator, ColorValue, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';

import { useThemeColor } from '@/hooks/use-theme-color';

type CenteredActivityIndicatorProps = {
  size?: 'small' | 'large' | number;
  color?: ColorValue;
};

export function CenteredActivityIndicator({ size, color }: CenteredActivityIndicatorProps) {  
  const activityColor = useThemeColor({}, 'tint');
  return (
    <ThemedView style={styles.activityIndicatorContainer}>
      <ActivityIndicator size={size} color={color ?? activityColor} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  activityIndicatorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
