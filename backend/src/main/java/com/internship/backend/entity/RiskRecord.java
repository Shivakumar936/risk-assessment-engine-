package com.internship.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "risk_records")
@EntityListeners(AuditingEntityListener.class)
public class RiskRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private String status;

    @Column(name = "risk_score")
    private Integer riskScore;

    @Column
    private String owner;

    @Column(name = "due_date")
    private java.time.LocalDate dueDate;

    @Column(name = "mitigation_plan", length = 2000)
    private String mitigationPlan;

    @Column(nullable = false)
    private Boolean deleted = false;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Integer getScore() {
        return riskScore;
    }

    public LocalDateTime getCreatedDate() {
        return createdAt;
    }

    public String getSeverity() {
        if (riskScore == null) return "LOW";
        if (riskScore >= 70) return "HIGH";
        if (riskScore >= 40) return "MEDIUM";
        return "LOW";
    }
}