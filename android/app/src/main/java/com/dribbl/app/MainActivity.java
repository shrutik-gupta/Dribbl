package com.dribbl.app;

import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        /* Back button: let the web app use it first (it closes an open modal), then step back
           through the screens the user visited, and only leave the app from the first screen. */
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                final WebView webView = getBridge().getWebView();
                webView.evaluateJavascript(
                    "(window.__nativeBack && window.__nativeBack()) ? 1 : 0",
                    handled -> {
                        if ("1".equals(handled)) return;
                        if (webView.canGoBack()) webView.goBack();
                        else moveTaskToBack(true);
                    }
                );
            }
        });
    }
}
