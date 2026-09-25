package ru.sarville.colorit;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

import ru.rustore.sdk.pay.RuStorePayClient;
import ru.rustore.sdk.pay.model.SdkTheme;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RuStorePayPlugin.class);
        super.onCreate(savedInstanceState);
        // The game is a SPA whose screens/modals are history entries (pages/index.tsx pushState/popstate),
        // so back steps through them exactly like in a browser. At the root (main menu) there is
        // nothing to go back to and the press is swallowed - it must not minimize/close the app.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge().getWebView();
                if (webView.canGoBack()) {
                    webView.goBack();
                }
            }
        });
        if (savedInstanceState == null) {
            proceedPayIntent(getIntent());
        }
    }

    // Returning from a banking app (SBP/SberPay) arrives as a deeplink intent for the scheme declared in the manifest.
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        proceedPayIntent(intent);
    }

    private void proceedPayIntent(Intent intent) {
        RuStorePayClient.Companion.getInstance().getIntentInteractor().proceedIntent(intent, SdkTheme.LIGHT);
    }
}
