import { useRouter } from 'expo-router';
import { StyleSheet, ScrollView, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import newTestamentBooks from '@/assets/data/new-testament.json';
import oldTestamentBooks from '@/assets/data/old-testament.json';

export default function ModalScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const navigateToReader = (book: string) => {
    // Dismiss modal and navigate to reader tab with book param
    router.replace({ pathname: '/(tabs)', params: { book } });
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.columnsContainer}>
          {/* Old Testament Column */}
          <View style={styles.column}>
            <ThemedText type="subtitle" style={styles.columnTitle}>
              Old Testament
            </ThemedText>
            {oldTestamentBooks.map((book) => (
              <TouchableOpacity
                key={book}
                onPress={() => navigateToReader(book)}
                style={styles.link}
              >
                <ThemedText type="link" style={styles.columnItem}>{book}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Separator */}
          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          {/* New Testament Column */}
          <View style={styles.column}>
            <ThemedText type="subtitle" style={styles.columnTitle}>
              New Testament
            </ThemedText>
            {newTestamentBooks.map((book) => (
              <TouchableOpacity
                key={book}
                onPress={() => navigateToReader(book)}
                style={styles.link}
              >
                <ThemedText type="link" style={styles.columnItem}>{book}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  columnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1, // Equal width for both columns
    paddingHorizontal: 10,
  },
  columnTitle: {
    marginBottom: 15,
    textAlign: 'center',
  },
  columnItem: {
    marginBottom: 0,
    textAlign: 'center',
  },
  link: {
    marginVertical: 5,
    paddingVertical: 5,
  },
  separator: {
    width: 1,
    marginVertical: 10,
  },
});