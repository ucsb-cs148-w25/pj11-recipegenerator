import React, { useRef } from 'react';
import {
    View,
    Animated,
    PanResponder,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Swipe threshold (e.g. 35% of screen width)
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;

// Height you want for each row
// Adjust or make it dynamic if needed
const ROW_HEIGHT = 70;

type SwipeableItemProps = {
    children: React.ReactNode;
    onDelete: () => void; // callback for deletion
    borderRadius?: number; // Allow customizing border radius
};

export default function SwipeableItem({
    children,
    onDelete,
    borderRadius = 10
}: SwipeableItemProps) {
    const translateX = useRef(new Animated.Value(0)).current;
    const lastOffset = useRef(0);

    // Calculate the opacity of the delete background based on swipe distance
    const deleteOpacity = translateX.interpolate({
        inputRange: [-SCREEN_WIDTH, -SWIPE_THRESHOLD / 2, 0],
        outputRange: [1, 0.5, 0],
        extrapolate: 'clamp',
    });

    // PanResponder to handle gestures
    const panResponder = useRef(
        PanResponder.create({
            // Start the gesture if user moves horizontally
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 5;
            },
            // Tracking the finger movement
            onPanResponderMove: (_, gestureState) => {
                // Only allow swiping to the left, so clamp translateX at 0 on the right side
                const newX = gestureState.dx < 0 ? gestureState.dx : 0;
                translateX.setValue(lastOffset.current + newX);
            },
            // When user releases finger
            onPanResponderRelease: (_, gestureState) => {
                lastOffset.current += gestureState.dx;
                // If the total swipe distance is more negative than our threshold, animate off-screen & delete
                if (gestureState.dx < -SWIPE_THRESHOLD) {
                    Animated.timing(translateX, {
                        toValue: -SCREEN_WIDTH, // move fully off-screen
                        duration: 200,
                        useNativeDriver: true,
                    }).start(() => {
                        onDelete();
                        // Reset translateX so if this item re-renders (e.g. via undo) it starts at 0
                        translateX.setValue(0);
                        lastOffset.current = 0;
                    });
                } else {
                    // Otherwise, bounce back to the start
                    Animated.spring(translateX, {
                        toValue: 0,
                        useNativeDriver: true,
                        friction: 6, // Higher friction for smoother bounce
                        tension: 80, // Lower tension for smoother bounce
                    }).start(() => {
                        lastOffset.current = 0;
                    });
                }
            },
            onPanResponderTerminate: () => {
                // If something else takes over the responder, reset
                Animated.spring(translateX, {
                    toValue: 0,
                    useNativeDriver: true,
                }).start(() => {
                    lastOffset.current = 0;
                });
            },
        })
    ).current;

    return (
        <View style={[styles.container, { borderRadius }]}>
            {/* RED BACKGROUND + TRASH ICON */}
            <Animated.View style={[
                styles.deleteBackground,
                { opacity: deleteOpacity, borderRadius }
            ]}>
                <FontAwesome name="trash" size={24} color="white" />
            </Animated.View>

            {/* FOREGROUND (the actual row) */}
            <Animated.View
                style={[
                    styles.foreground,
                    { transform: [{ translateX }], borderRadius }
                ]}
                {...panResponder.panHandlers}
            >
                {children}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: ROW_HEIGHT,
        marginBottom: 10,
    },
    deleteBackground: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 0,
        left: 0,
        backgroundColor: '#FF6B6B',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 20,
    },
    foreground: {
        height: ROW_HEIGHT,
        backgroundColor: '#fff',
        justifyContent: 'center',
        // shadow for iOS/Android
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        paddingHorizontal: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
});
