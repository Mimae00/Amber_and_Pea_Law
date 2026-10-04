package com.amberpea.law;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Amber &amp; Pea Law API. The firm is fictional; all seeded content is sample content.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class AmberPeaLawApplication {

    public static void main(String[] args) {
        SpringApplication.run(AmberPeaLawApplication.class, args);
    }
}
