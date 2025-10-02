import { ActivityIndicator, ColorValue, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedView } from '@/components/themed-view';

type CenteredActivityIndicatorProps = {
  size?: 'small' | 'large' | number;
  color?: ColorValue;
};

export function CenteredActivityIndicator({ size, color }: CenteredActivityIndicatorProps) {  
  return (
    <ThemedView style={styles.activityIndicatorContainer}>
      <ActivityIndicator size={size} color={color} />
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
